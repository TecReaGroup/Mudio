import type { ReactNode } from 'react';

/** Draggable title bar of the player window. Height must match titleBarHeight in electron/player/player-window.ts. */
export function WindowTitleBar({ children }: { children: ReactNode }) {
  return (
    <header className="drag-region flex h-12 shrink-0 items-center gap-2 pl-[max(8px,var(--titlebar-inset-start))] pr-[calc(var(--titlebar-inset-end)+8px)]">
      {children}
    </header>
  );
}
