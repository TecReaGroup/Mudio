import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Doubles as the window drag area; right padding keeps clear of the native caption buttons. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="drag-region flex h-16 shrink-0 items-center gap-4 border-b border-border pl-6 pr-[calc(var(--titlebar-inset-end)+16px)]">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}
