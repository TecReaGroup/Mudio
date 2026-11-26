import { useEffect, useRef, type RefObject } from 'react';

/**
 * Seeks without queueing: while a seek is in flight only the newest target is kept, applied once it lands.
 * A fast scrub would otherwise stack dozens of frame-accurate seeks and the picture would trail far behind the thumb.
 */
export function useCoalescedSeek(videoRef: RefObject<HTMLVideoElement | null>): (timeSec: number) => void {
  const pendingTimeSec = useRef<number | undefined>(undefined);

  useEffect(() => {
    const element = videoRef.current!;
    const applyPendingSeek = () => {
      if (pendingTimeSec.current === undefined) return;
      element.currentTime = pendingTimeSec.current;
      pendingTimeSec.current = undefined;
    };
    element.addEventListener('seeked', applyPendingSeek);
    return () => element.removeEventListener('seeked', applyPendingSeek);
  }, [videoRef]);

  return timeSec => {
    const element = videoRef.current!;
    // Scrubbing between two keyframes keeps snapping to the same one; re-seeking it would only redo the decode.
    if (timeSec === element.currentTime) {
      pendingTimeSec.current = undefined;
      return;
    }
    if (element.seeking) pendingTimeSec.current = timeSec;
    else element.currentTime = timeSec;
  };
}
