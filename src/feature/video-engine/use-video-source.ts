import { useEffect, useState, type RefObject } from 'react';
import { videoSourceUrl } from '../../shared/api/mudio';
import { buildMediaUrl, MEDIA_HOST, TRANSCODE_RESPONSE } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';

// Reading pauses this far ahead of playback; ffmpeg then blocks on the full pipe instead of burning CPU.
const BUFFER_AHEAD_SEC = 30;
// Played media kept for short rewinds; older media is evicted to stay under Chromium's SourceBuffer quota.
const BUFFER_BEHIND_SEC = 20;
// Requested slightly before the target so the first appended frame covers it; MSE stalls at a gap before buffered media.
const STREAM_LEAD_SEC = 0.5;
// A seek this little past what the running stream has delivered waits for it: restarting ffmpeg takes longer.
const STREAM_CATCH_UP_SEC = 3;
// Only has to be a supported declaration: Chromium decodes whichever H.264 profile the encoder actually emits.
const VIDEO_CODEC = 'avc1.640033';
const AUDIO_CODEC = 'mp4a.40.2';

/** Why a video Chromium rejected did not play through the system's ffmpeg either. */
export type TranscodeFailure = 'ffmpeg-missing' | 'unsupported-codec';

interface VideoSource {
  url: string;
  /** Playing ffmpeg's transcode, whose keyframes are its own: the source file's keyframe index does not apply. */
  isTranscoded: boolean;
  /** Set once the system's ffmpeg could not take over either. */
  transcodeFailure: TranscodeFailure | undefined;
  /** Handles the element's error: an unsupported codec moves playback to ffmpeg once; returns false when nothing is left to try. */
  recoverFromError: (error: MediaError | null) => boolean;
}

function transcodedStreamUrl(videoId: string, startSec: number): string {
  return `${buildMediaUrl(MEDIA_HOST.transcode, videoId)}?start=${startSec.toFixed(3)}`;
}

/** Media the current stream holds or is about to deliver, in source time. */
interface StreamSpan {
  startSec: number;
  endSec: number;
}

function bufferedEndAround(ranges: TimeRanges, timeSec: number): number | undefined {
  for (let index = 0; index < ranges.length; index++) {
    if (ranges.start(index) <= timeSec && timeSec < ranges.end(index)) return ranges.end(index);
  }
  return undefined;
}

function whenIdle(sourceBuffer: SourceBuffer): Promise<void> {
  if (!sourceBuffer.updating) return Promise.resolve();
  return new Promise(resolve => sourceBuffer.addEventListener('updateend', () => resolve(), { once: true }));
}

function nextEvent(target: EventTarget, types: string[], signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const settle = () => {
      for (const type of types) target.removeEventListener(type, settle);
      signal.removeEventListener('abort', settle);
      if (signal.aborted) reject(signal.reason);
      else resolve();
    };
    for (const type of types) target.addEventListener(type, settle);
    signal.addEventListener('abort', settle);
  });
}

/**
 * Feeds ffmpeg's transcode into Media Source Extensions. The stream keeps the source's timestamps and the MediaSource
 * its duration, so currentTime, seeking and resume behave exactly as with direct playback. A seek outside the
 * current stream's reach restarts the transcode at the target.
 */
class TranscodedPlayback {
  readonly url: string;
  private readonly mediaSource = new MediaSource();
  private readonly lifetime = new AbortController();
  private sourceBuffer: SourceBuffer | undefined;
  private currentStream: AbortController | undefined;
  // Judged by the current stream alone: media left over from an earlier one is wiped once this stream's response arrives.
  private streamSpan: StreamSpan | undefined;

  constructor(
    private readonly element: HTMLVideoElement,
    private readonly videoId: string,
    /** Where playback is expected to begin, such as a resume position; a stream from 0 would be restarted right away. */
    startSec: number,
    /** Called at most once; playback has stopped for good by then. */
    private readonly onFailure: (failure: TranscodeFailure) => void,
  ) {
    this.url = URL.createObjectURL(this.mediaSource);
    this.mediaSource.addEventListener('sourceopen', () => void this.streamFrom(startSec), { once: true, signal: this.lifetime.signal });
    element.addEventListener('seeking', this.followSeek, { signal: this.lifetime.signal });
    // Runs after the resume listener, so it only steps in when playback did not begin at startSec after all.
    element.addEventListener('loadedmetadata', this.followSeek, { once: true, signal: this.lifetime.signal });
  }

  dispose(): void {
    this.lifetime.abort();
    this.currentStream?.abort();
    URL.revokeObjectURL(this.url);
  }

  private readonly followSeek = () => {
    const timeSec = this.element.currentTime;
    const span = this.streamSpan;
    if (span && span.startSec <= timeSec && timeSec <= span.endSec + STREAM_CATCH_UP_SEC) return;
    void this.streamFrom(timeSec);
  };

  /** Replaces whatever stream is running; every await re-checks the signal, since a newer seek may have taken over. */
  private async streamFrom(targetSec: number): Promise<void> {
    this.currentStream?.abort();
    const stream = new AbortController();
    this.currentStream = stream;
    const startSec = Math.max(0, targetSec - STREAM_LEAD_SEC);
    this.streamSpan = { startSec, endSec: startSec };
    try {
      const response = await fetch(transcodedStreamUrl(this.videoId, startSec), { signal: stream.signal });
      if (!response.ok) {
        const failure = response.status === TRANSCODE_RESPONSE.ffmpegMissingStatus ? 'ffmpeg-missing' : 'unsupported-codec';
        this.fail(failure, `transcode responded with status ${response.status}`);
        return;
      }
      const sourceBuffer = this.sourceBuffer ?? this.createSourceBuffer(response.headers);
      await this.clear(sourceBuffer, stream.signal);
      // Fetch bodies are never backed by shared memory, which appendBuffer rejects.
      const reader = (response.body as ReadableStream<Uint8Array<ArrayBuffer>>).getReader();
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        await this.waitForBufferRoom(sourceBuffer, stream.signal);
        await this.append(sourceBuffer, chunk.value, stream.signal);
        stream.signal.throwIfAborted();
        const { buffered } = sourceBuffer;
        if (buffered.length > 0) this.streamSpan = { startSec: buffered.start(0), endSec: buffered.end(buffered.length - 1) };
      }
      stream.signal.throwIfAborted();
      this.mediaSource.endOfStream();
    } catch (error) {
      if (!stream.signal.aborted) this.fail('unsupported-codec', describeError(error));
    }
  }

  private createSourceBuffer(headers: Headers): SourceBuffer {
    // Set before the first append: a fragmented MP4 declares no duration of its own.
    this.mediaSource.duration = Number(headers.get(TRANSCODE_RESPONSE.durationHeader));
    const codecs = headers.get(TRANSCODE_RESPONSE.hasAudioHeader) === 'true' ? `${VIDEO_CODEC}, ${AUDIO_CODEC}` : VIDEO_CODEC;
    this.sourceBuffer = this.mediaSource.addSourceBuffer(`video/mp4; codecs="${codecs}"`);
    return this.sourceBuffer;
  }

  /** Empties the buffer for a new transcode, dropping the half-parsed fragment the previous one was cut off in. */
  private async clear(sourceBuffer: SourceBuffer, signal: AbortSignal): Promise<void> {
    await whenIdle(sourceBuffer);
    signal.throwIfAborted();
    if (this.mediaSource.readyState === 'open') sourceBuffer.abort();
    if (sourceBuffer.buffered.length === 0) return;
    sourceBuffer.remove(0, this.mediaSource.duration);
    await whenIdle(sourceBuffer);
    signal.throwIfAborted();
  }

  private async waitForBufferRoom(sourceBuffer: SourceBuffer, signal: AbortSignal): Promise<void> {
    for (;;) {
      signal.throwIfAborted();
      const bufferedEnd = bufferedEndAround(sourceBuffer.buffered, this.element.currentTime);
      if (bufferedEnd === undefined || bufferedEnd - this.element.currentTime < BUFFER_AHEAD_SEC) return;
      await nextEvent(this.element, ['timeupdate', 'seeking'], signal);
    }
  }

  private async append(sourceBuffer: SourceBuffer, chunk: Uint8Array<ArrayBuffer>, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    const evictBeforeSec = this.element.currentTime - BUFFER_BEHIND_SEC;
    if (sourceBuffer.buffered.length > 0 && sourceBuffer.buffered.start(0) < evictBeforeSec) {
      sourceBuffer.remove(0, evictBeforeSec);
      await whenIdle(sourceBuffer);
      signal.throwIfAborted();
    }
    sourceBuffer.appendBuffer(chunk);
    await whenIdle(sourceBuffer);
  }

  private fail(failure: TranscodeFailure, detail: string): void {
    if (this.lifetime.signal.aborted) return;
    log('warn', 'Player', `Transcoded playback of ${this.videoId} failed (${failure}): ${detail}`);
    this.dispose();
    this.onFailure(failure);
  }
}

/** Direct file playback first; the system's ffmpeg takes over only once Chromium has rejected the codec. */
export function useVideoSource(videoRef: RefObject<HTMLVideoElement | null>, videoId: string, startSec: number): VideoSource {
  const [transcodedPlayback, setTranscodedPlayback] = useState<TranscodedPlayback | undefined>(undefined);
  const [transcodeFailure, setTranscodeFailure] = useState<TranscodeFailure | undefined>(undefined);

  useEffect(() => () => transcodedPlayback?.dispose(), [transcodedPlayback]);

  return {
    url: transcodedPlayback?.url ?? videoSourceUrl(videoId),
    isTranscoded: transcodedPlayback !== undefined,
    transcodeFailure,
    recoverFromError: error => {
      if (transcodedPlayback || error?.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return false;
      log('info', 'Player', `Codec unsupported for ${videoId}, switching to transcoded playback`);
      setTranscodedPlayback(new TranscodedPlayback(videoRef.current!, videoId, startSec, setTranscodeFailure));
      return true;
    },
  };
}
