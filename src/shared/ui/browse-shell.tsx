import type { ReactNode } from 'react';
import { TEXT_CLASS } from './text-class';

interface BrowseShellProps {
  sidebar: ReactNode;
  /** Replaces the brand in the top bar, e.g. a back button on sub pages. */
  topBarStart?: ReactNode;
  /** The sidebar's main action, pinned to the bottom. */
  sidebarFooter?: ReactNode;
  /** Visually centered in the top bar regardless of what sits beside it. */
  topBarCenter?: ReactNode;
  children: ReactNode;
}

/**
 * Shell for list / management / settings pages: sidebar and content share one canvas,
 * the content column owning its own top bar and the only page-level scroll.
 */
export function BrowseShell({ sidebar, topBarStart, sidebarFooter, topBarCenter, children }: BrowseShellProps) {
  return (
    <div className="flex h-full min-w-0 flex-col bg-canvas">
      {/*
        Spans the whole window so the center slot is centered on the window, not the content column.
        Equal side columns keep it centered; each is at least as wide as the sidebar and the native caption buttons.
        Height must match TITLE_BAR_HEIGHT in electron/window/library-window.ts.
      */}
      <header className="drag-region grid h-14 shrink-0 border-b border-line grid-cols-[minmax(var(--side),1fr)_minmax(0,28rem)_minmax(var(--side),1fr)] items-center gap-3 [--side:max(15rem,var(--titlebar-inset-end))]">
        <div className="flex items-center gap-2.5 pl-[max(20px,var(--titlebar-inset-start))]">
          {topBarStart ? (
            <div className="-ml-2 flex items-center">{topBarStart}</div>
          ) : (
            <>
              <img src="./icon.png" alt="" draggable={false} className="size-7" />
              <span className={TEXT_CLASS.panelTitle}>Mudio</span>
            </>
          )}
        </div>
        <div className="min-w-0">{topBarCenter}</div>
        <div />
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col">
          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-3 pt-6">{sidebar}</div>
          {sidebarFooter && <div className="flex shrink-0 flex-col gap-2 p-3">{sidebarFooter}</div>}
        </aside>
        <main className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-screen-2xl flex-col pb-12 pl-7 pr-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
