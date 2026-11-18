import { useEffect, useRef, type RefObject } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';

const PROGRESS_SAVE_INTERVAL_MS = 5_000;
const RESUME_MIN_POSITION_SEC = 5;
const RESUME_END_MARGIN_SEC = 5;

/**
 * Restores the saved position on load and periodically persists the current one.
 * Expects the owning component to be keyed by video id, so it runs once per video.
 */
export function usePlaybackProgress(videoRef: RefObject<HTMLVideoElement | null>, video: VideoEntry, shouldResume: boolean): void {
  // Snapshot at mount: the entry keeps updating while we save progress.
  const resumeFrom = useRef(shouldResume ? video.resumePositionSec : 0);

  useEffect(() => {
    const element = videoRef.current!;
    let lastSavedAt = 0;

    const savePosition = (positionSec: number) => {
      lastSavedAt = Date.now();
      mudio.library.recordPlayback(video.id, positionSec)
        .catch(error => log('warn', 'Player', `Failed to save progress: ${describeError(error)}`));
    };

    const resume = () => {
      const position = resumeFrom.current;
      if (position >= RESUME_MIN_POSITION_SEC && position < element.duration - RESUME_END_MARGIN_SEC) {
        element.currentTime = position;
      }
    };
    const onTimeUpdate = () => {
      if (Date.now() - lastSavedAt >= PROGRESS_SAVE_INTERVAL_MS) savePosition(element.currentTime);
    };
    const onPause = () => {
      if (!element.ended) savePosition(element.currentTime);
    };
    const onEnded = () => savePosition(0);

    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) resume();
    element.addEventListener('loadedmetadata', resume);
    element.addEventListener('timeupdate', onTimeUpdate);
    element.addEventListener('pause', onPause);
    element.addEventListener('ended', onEnded);
    return () => {
      element.removeEventListener('loadedmetadata', resume);
      element.removeEventListener('timeupdate', onTimeUpdate);
      element.removeEventListener('pause', onPause);
      element.removeEventListener('ended', onEnded);
      if (!element.ended && element.currentTime > 0) savePosition(element.currentTime);
    };
  }, [videoRef, video.id]);
}
