import type { ReactNode } from 'react';

/** Responsive grid shared by video and playlist cards so both pages line up. */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid animate-fade-in grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-x-5 gap-y-7">
      {children}
    </ul>
  );
}
