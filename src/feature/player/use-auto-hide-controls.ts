import { useCallback, useEffect, useRef, useState } from 'react';

const CONTROLS_HIDE_DELAY_MS = 2_500;

/** Controls stay visible while paused; during playback they hide after a quiet period. */
export function useAutoHideControls(isPlaying: boolean) {
  const [isIdle, setIsIdle] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);

  const revealControls = useCallback(() => {
    setIsIdle(false);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setIsIdle(true), CONTROLS_HIDE_DELAY_MS);
  }, []);

  useEffect(() => {
    revealControls();
    return () => window.clearTimeout(hideTimer.current);
  }, [isPlaying, revealControls]);

  return { areControlsVisible: !isPlaying || !isIdle, revealControls };
}
