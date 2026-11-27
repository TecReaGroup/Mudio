import { buildMediaUrl, MEDIA_HOST, TRANSCODE_RESPONSE } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';

// Reading pauses this far ahead of playback; ffmpeg then blocks on the full pipe instead of burning CPU.
const BUFFER_AHEAD_SEC = 30;
// Media kept around the playhead, so seeks back into it need no transcode. Everything outside is evicted: Chromium
// caps a video SourceBuffer near 150 MB, and 70 s at the 10 Mbps transcode bitrate stays well below that.
const RETAIN_BEHIND_SEC = 20;
const RETAIN_AHEAD_SEC = 50;
// Requested slightly before the target so the first appended frame covers it; MSE stalls at a gap before buffered media.
const STREAM_LEAD_SEC = 0.5;
// A target this little past the running stream's front waits for it: restarting ffmpeg takes longer.
const STREAM_CATCH_UP_SEC = 3;
// Range ends closer than this are the same point; buffered times carry rounding from the media timescale.
const TIME_TOLERANCE_SEC = 0.1;
// Only has to be a supported declaration: Chromium decodes whichever H.264 profile the encoder actually emits.
const VIDEO_CODEC = 'avc1.640033';
const AUDIO_CODEC = 'mp4a.40.2';

/** Why a video Chromium rejected did not play through the system's ffmpeg either. */
export type TranscodeFailure = 'ffmpeg-missing' | 'unsupported-codec';

interface RunningStream {
  abort: AbortController;
  /** End of the media this stream has appended so far; its next fragment continues from here. */
  frontSec: number;
}

function transcodedStreamUrl(videoId: string, startSec: number): string {
  return `${buildMediaUrl(MEDIA_HOST.transcode, videoId)}?start=${startSec.toFixed(3)}`;
}

/** End of the buffered range playback at `timeSec` would run through, or undefined if nothing is buffered there. */
function bufferedEndAround(ranges: TimeRanges, timeSec: number): number | undefined {
  for (let index = 0; index < ranges.length; index++) {
    if (ranges.start(index) <= timeSec && timeSec < ranges.end(index)) return ranges.end(index);
  }
  return undefined;
}

/** Like bufferedEndAround, but a range that starts or ends right at `timeSec` counts: a stream's front is such a point. */
function bufferedEndTouching(ranges: TimeRanges, timeSec: number): number | undefined {
  for (let index = 0; index < ranges.length; index++) {
    if (ranges.start(index) <= timeSec + TIME_TOLERANCE_SEC && timeSec <= ranges.end(index) + TIME_TOLERANCE_SEC) return ranges.end(index);
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

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

/**
 * Feeds ffmpeg's transcode into Media Source Extensions, so currentTime, seeking and resume behave as with direct
 * playback. One transcode runs at a time, from where the playhead needs media; media from earlier transcodes stays
 * buffered within a window around the playhead, so seeking back into it is instant.
 *
 * Every transcode is timestamped from 0 at its start, and `timestampOffset` places it on the file's timeline.
 */
export class TranscodedPlayback {
  readonly url: string;
  private readonly mediaSource = new MediaSource();
  private readonly lifetime = new AbortController();
  private sourceBuffer: SourceBuffer | undefined;
  private stream: RunningStream | undefined;

  constructor(
    private readonly element: HTMLVideoElement,
    private readonly videoId: string,
    /** Where playback is expected to begin, such as a resume position; a stream from 0 would be restarted right away. */
    startSec: number,
    /** Called at most once; playback has stopped for good by then. */
    private readonly onFailure: (failure: TranscodeFailure) => void,
  ) {
    this.url = URL.createObjectURL(this.mediaSource);
    const { signal } = this.lifetime;
    // Nothing can be appended before the source opens, so the playhead is only followed from then on.
    this.mediaSource.addEventListener('sourceopen', () => {
      void this.streamFrom(startSec);
      element.addEventListener('seeking', this.feedPlayhead, { signal });
      // Playback reached the end of media no stream is extending, such as a range left by an earlier transcode.
      element.addEventListener('waiting', this.feedPlayhead, { signal });
      // Runs after the resume listener, so it only steps in when playback did not begin at startSec after all.
      element.addEventListener('loadedmetadata', this.feedPlayhead, { once: true, signal });
    }, { once: true, signal });
  }

  dispose(): void {
    this.lifetime.abort();
    this.stream?.abort.abort();
    URL.revokeObjectURL(this.url);
  }

  /** Makes sure media will keep arriving where the playhead is, restarting the transcode only when nothing else will. */
  private readonly feedPlayhead = () => {
    const timeSec = this.element.currentTime;
    const rangeEndSec = this.sourceBuffer && bufferedEndAround(this.sourceBuffer.buffered, timeSec);
    const frontSec = this.stream?.frontSec;
    if (rangeEndSec === undefined) {
      if (frontSec !== undefined && frontSec - TIME_TOLERANCE_SEC <= timeSec && timeSec <= frontSec + STREAM_CATCH_UP_SEC) return;
      void this.streamFrom(timeSec);
      return;
    }
    const isExtendedByStream = frontSec !== undefined && Math.abs(rangeEndSec - frontSec) < TIME_TOLERANCE_SEC;
    const reachesEnd = rangeEndSec >= this.mediaSource.duration - TIME_TOLERANCE_SEC;
    // Continue right where the buffered range runs out, so playback flows on without stalling at its edge.
    if (!isExtendedByStream && !reachesEnd) void this.streamFrom(rangeEndSec);
  };

  /** Replaces whatever stream is running; every await re-checks the signal, since a newer one may have taken over. */
  private async streamFrom(targetSec: number): Promise<void> {
    this.stream?.abort.abort();
    const startSec = Math.max(0, targetSec - STREAM_LEAD_SEC);
    const stream: RunningStream = { abort: new AbortController(), frontSec: startSec };
    this.stream = stream;
    const { signal } = stream.abort;
    log('debug', 'Player', `Transcode ${this.videoId} from ${startSec.toFixed(1)}s`);
    try {
      const response = await fetch(transcodedStreamUrl(this.videoId, startSec), { signal });
      if (!response.ok) {
        const failure = response.status === TRANSCODE_RESPONSE.ffmpegMissingStatus ? 'ffmpeg-missing' : 'unsupported-codec';
        this.fail(failure, `transcode responded with status ${response.status}`);
        return;
      }
      const sourceBuffer = this.sourceBuffer ?? this.createSourceBuffer(response.headers);
      await this.placeAt(sourceBuffer, startSec, signal);
      // Fetch bodies are never backed by shared memory, which appendBuffer rejects.
      const reader = (response.body as ReadableStream<Uint8Array<ArrayBuffer>>).getReader();
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        await this.waitForBufferRoom(sourceBuffer, signal);
        await this.append(sourceBuffer, chunk.value, signal);
        stream.frontSec = bufferedEndTouching(sourceBuffer.buffered, stream.frontSec) ?? stream.frontSec;
      }
      signal.throwIfAborted();
      this.stream = undefined;
      // Sets the duration to the buffered end, which is the file's end only because this stream ran through it.
      this.mediaSource.endOfStream();
    } catch (error) {
      if (!signal.aborted) this.fail('unsupported-codec', describeError(error));
    }
  }

  private createSourceBuffer(headers: Headers): SourceBuffer {
    // Set before the first append: a fragmented MP4 declares no duration of its own.
    this.mediaSource.duration = Number(headers.get(TRANSCODE_RESPONSE.durationHeader));
    const codecs = headers.get(TRANSCODE_RESPONSE.hasAudioHeader) === 'true' ? `${VIDEO_CODEC}, ${AUDIO_CODEC}` : VIDEO_CODEC;
    this.sourceBuffer = this.mediaSource.addSourceBuffer(`video/mp4; codecs="${codecs}"`);
    return this.sourceBuffer;
  }

  /** Prepares the buffer for a new transcode whose timestamps count from 0 at `startSec`. */
  private async placeAt(sourceBuffer: SourceBuffer, startSec: number, signal: AbortSignal): Promise<void> {
    await whenIdle(sourceBuffer);
    signal.throwIfAborted();
    // Drops the half-parsed fragment the previous stream was cut off in; only allowed while open.
    if (this.mediaSource.readyState === 'open') sourceBuffer.abort();
    sourceBuffer.timestampOffset = startSec;
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
    for (;;) {
      await this.evictOutsideWindow(sourceBuffer, signal);
      try {
        sourceBuffer.appendBuffer(chunk);
        await whenIdle(sourceBuffer);
        return;
      } catch (error) {
        if (!isQuotaExceeded(error)) throw error;
        // Still full after eviction, as with a very high bitrate: playback has to move on and free room first.
        await nextEvent(this.element, ['timeupdate', 'seeking'], signal);
      }
    }
  }

  private async evictOutsideWindow(sourceBuffer: SourceBuffer, signal: AbortSignal): Promise<void> {
    const timeSec = this.element.currentTime;
    const behindSec = timeSec - RETAIN_BEHIND_SEC;
    if (sourceBuffer.buffered.length > 0 && sourceBuffer.buffered.start(0) < behindSec) {
      sourceBuffer.remove(0, behindSec);
      await whenIdle(sourceBuffer);
      signal.throwIfAborted();
    }
    // The running stream never gets this far ahead, so only leftovers of earlier transcodes go.
    const aheadSec = timeSec + RETAIN_AHEAD_SEC;
    const { buffered } = sourceBuffer;
    if (buffered.length > 0 && buffered.end(buffered.length - 1) > aheadSec && aheadSec < this.mediaSource.duration) {
      sourceBuffer.remove(aheadSec, this.mediaSource.duration);
      await whenIdle(sourceBuffer);
      signal.throwIfAborted();
    }
  }

  private fail(failure: TranscodeFailure, detail: string): void {
    if (this.lifetime.signal.aborted) return;
    log('warn', 'Player', `Transcoded playback of ${this.videoId} failed (${failure}): ${detail}`);
    this.dispose();
    this.onFailure(failure);
  }
}
