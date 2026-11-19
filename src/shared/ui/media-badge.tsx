import type { ReactNode } from 'react';

/** Small dark pill pinned to the bottom-right corner of a `relative` media frame, e.g. duration or item count. */
export function MediaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-control-sm bg-black/70 px-1.5 py-0.5 text-meta font-medium tabular-nums text-white [&_svg]:size-3.5">
      {children}
    </span>
  );
}
