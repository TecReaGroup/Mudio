import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';

const CONTROLS_HIDE_DELAY_MS = 1_000;

/**
 * Controls hide as soon as the pointer leaves the stage, and after a quiet period while it rests over the
 * video itself. Resting on the controls keeps them visible so they never vanish under the cursor.
 */
export function useAutoHideControls(isPlaying: boolean, videoRef: RefObject<HTMLVideoElement | null>) {
  const [isIdle, setIsIdle] = useState(false);
  const [isPointerAway, setIsPointerAway] = useState(false);
  const [isPointerOverVideo, setIsPointerOverVideo] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);

  const revealControls = useCallback(() => {
    setIsPointerAway(false);
    setIsIdle(false);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setIsIdle(true), CONTROLS_HIDE_DELAY_MS);
  }, []);

  const trackPointer = useCallback(
    (event: MouseEvent) => {
      setIsPointerOverVideo(event.target === videoRef.current);
      revealControls();
    },
    [videoRef, revealControls],
  );

  useEffect(() => {
    revealControls();
    return () => window.clearTimeout(hideTimer.current);
  }, [isPlaying, revealControls]);

  const concealControls = useCallback(() => setIsPointerAway(true), []);

  return {
    areControlsVisible: !isPointerAway && (!isPointerOverVideo || !isIdle),
    revealControls,
    trackPointer,
    concealControls,
  };
}
