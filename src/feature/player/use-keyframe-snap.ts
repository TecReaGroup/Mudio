import { useEffect, useState } from 'react';
import { mudio } from '../../shared/api/mudio';
import { describeError, log } from '../../shared/lib/logger';

// Lands just after the keyframe: a target a hair before it would make the decoder start from the previous one.
const KEYFRAME_LEAD_SEC = 0.05;

function nearestKeyframe(keyframeTimes: number[], timeSec: number): number {
  let low = 0;
  let high = keyframeTimes.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (keyframeTimes[middle] < timeSec) low = middle + 1;
    else high = middle;
  }
  const after = keyframeTimes[low];
  const before = keyframeTimes[Math.max(0, low - 1)];
  return timeSec - before <= after - timeSec ? before : after;
}

/**
 * Maps a scrub position to the nearest keyframe. Chromium has no fastSeek(), and an exact seek decodes from the
 * previous keyframe up to the target, so on long-GOP video only keyframe seeks are cheap enough to follow a drag.
 * Returns the time unchanged until the index arrives, or when the file has none.
 */
export function useKeyframeSnap(videoId: string): (timeSec: number) => number {
  const [keyframeTimes, setKeyframeTimes] = useState<number[]>([]);

  useEffect(() => {
    let isCurrent = true;
    mudio.media.keyframeTimes(videoId)
      .then(times => {
        if (isCurrent) setKeyframeTimes(times);
      })
      .catch(error => log('warn', 'Player', `Keyframe index unavailable: ${describeError(error)}`));
    return () => {
      isCurrent = false;
    };
  }, [videoId]);

  return timeSec => (keyframeTimes.length === 0 ? timeSec : nearestKeyframe(keyframeTimes, timeSec) + KEYFRAME_LEAD_SEC);
}
