import type { ReactNode } from 'react';
import { BackButton } from './back-button';
import { TEXT_CLASS } from './text-class';

interface BackTitleBarProps {
  backLabel: string;
  title?: string;
  onBack: () => void;
  actions?: ReactNode;
}

/** Top bar of the work shell. Height must match TITLE_BAR_HEIGHT in electron/window/main-window.ts. */
export function BackTitleBar({ backLabel, title, onBack, actions }: BackTitleBarProps) {
  return (
    <header className="drag-region flex h-14 shrink-0 items-center border-b border-line gap-2 pl-[max(8px,var(--titlebar-inset-start))] pr-[calc(var(--titlebar-inset-end)+8px)]">
      <BackButton label={backLabel} onBack={onBack} />
      {title && <span aria-hidden className="h-4 w-px shrink-0 bg-line" />}
      <h1 className={`min-w-0 flex-1 truncate ${TEXT_CLASS.barTitle}`}>{title}</h1>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
