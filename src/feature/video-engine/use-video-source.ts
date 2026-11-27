import { useEffect, useState, type RefObject } from 'react';
import { videoSourceUrl } from '../../shared/api/mudio';
import { log } from '../../shared/lib/logger';
import { TranscodedPlayback, type TranscodeFailure } from './transcoded-playback';

interface VideoSource {
  url: string;
  /** Playing ffmpeg's transcode, whose keyframes are its own: the source file's keyframe index does not apply. */
  isTranscoded: boolean;
  /** Set once the system's ffmpeg could not take over either. */
  transcodeFailure: TranscodeFailure | undefined;
  /** Handles the element's error: an unsupported codec moves playback to ffmpeg once; returns false when nothing is left to try. */
  recoverFromError: (error: MediaError | null) => boolean;
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
