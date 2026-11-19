import { cn } from '../../shared/lib/cn';

// Negative delays start each bar mid-cycle, so they bounce out of phase from the first frame.
const BAR_DELAYS_MS = [0, -450, -200, -650];

/** Equalizer bars that bounce while playing and freeze in place when paused. */
export function NowPlayingBars({ isPlaying, label }: { isPlaying: boolean; label: string }) {
  return (
    <span role="img" aria-label={label} className="flex h-4 items-end gap-0.75">
      {BAR_DELAYS_MS.map(delayMs => (
        <span
          key={delayMs}
          className={cn(
            'h-full w-0.75 origin-bottom animate-equalizer rounded-full bg-white motion-reduce:animate-none',
            !isPlaying && '[animation-play-state:paused]',
          )}
          style={{ animationDelay: `${delayMs}ms` }}
        />
      ))}
    </span>
  );
}
