import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react';

const LONG_PRESS_MS = 300;
export const PRESS_HOLD_RATE = 3;
const FAST_FORWARD_KEY = 'ArrowRight';

export type PressHold = 'rewind' | 'fast-forward';

const HOLD_BY_BUTTON: Partial<Record<number, PressHold>> = { 0: 'rewind', 2: 'fast-forward' };

interface PressGestureCallbacks {
  onTap: () => void;
  onSkipForward: () => void;
}

/**
 * Press gestures on the player: a short left press is a tap, holding the left button rewinds and holding
 * the right button fast-forwards, both until release. The right arrow key mirrors the right button:
 * a short press skips forward, holding it fast-forwards.
 */
export function useVideoPressGesture(videoRef: RefObject<HTMLVideoElement | null>, { onTap, onSkipForward }: PressGestureCallbacks) {
  const [pressHold, setPressHold] = useState<PressHold | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);
  const latestOnSkipForward = useRef(onSkipForward);
  latestOnSkipForward.current = onSkipForward;

  const scheduleHold = (hold: PressHold) => {
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = undefined;
      setPressHold(hold);
    }, LONG_PRESS_MS);
  };

  const endHold = () => {
    window.clearTimeout(holdTimer.current);
    holdTimer.current = undefined;
    setPressHold(undefined);
  };

  useEffect(() => {
    // The skip waits for keyup: acting on keydown would let auto-repeat turn a hold into a burst of skips.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== FAST_FORWARD_KEY || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (!event.repeat) scheduleHold('fast-forward');
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== FAST_FORWARD_KEY) return;
      const isTap = holdTimer.current !== undefined;
      endHold();
      if (isTap) latestOnSkipForward.current();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // A release outside the window never reaches the player, so losing focus must also end the hold.
    window.addEventListener('blur', endHold);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', endHold);
      window.clearTimeout(holdTimer.current);
    };
  }, []);

  // Chromium rejects negative playbackRate, so rewinding seeks back along a wall-clock line from the press
  // point. Skipping frames while a seek is in flight lets slow decodes throttle the loop instead of queueing.
  useEffect(() => {
    if (pressHold !== 'rewind') return;
    const element = videoRef.current!;
    const anchorTimeSec = element.currentTime;
    const startedAt = performance.now();
    let frame = 0;
    const stepBack = (now: number) => {
      if (!element.seeking) element.currentTime = Math.max(0, anchorTimeSec - ((now - startedAt) / 1000) * PRESS_HOLD_RATE);
      frame = requestAnimationFrame(stepBack);
    };
    frame = requestAnimationFrame(stepBack);
    return () => cancelAnimationFrame(frame);
  }, [pressHold, videoRef]);

  const pressHandlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      const hold = HOLD_BY_BUTTON[event.button];
      if (!hold) return;
      // Capture so the release is still seen after the pointer drifts onto the overlays.
      event.currentTarget.setPointerCapture(event.pointerId);
      scheduleHold(hold);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (!HOLD_BY_BUTTON[event.button]) return;
      const isTap = event.button === 0 && holdTimer.current !== undefined;
      endHold();
      if (isTap) onTap();
    },
    onPointerCancel: endHold,
    onContextMenu: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
  };

  return { pressHold, pressHandlers };
}
