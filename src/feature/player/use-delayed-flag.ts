import { useEffect, useState } from 'react';

/** Mirrors `isActive`, but only turns on after it has stayed on for `delayMs`; turns off immediately. */
export function useDelayedFlag(isActive: boolean, delayMs: number): boolean {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsShown(false);
      return;
    }
    const timer = window.setTimeout(() => setIsShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [isActive, delayMs]);

  return isShown;
}
