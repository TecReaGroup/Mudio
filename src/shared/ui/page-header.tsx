import type { ReactNode } from 'react';
import { TEXT_CLASS } from './text-class';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Sits before the title, e.g. a back button. */
  leading?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, leading, actions }: PageHeaderProps) {
  return (
    <header className="flex shrink-0 items-end gap-4 pb-5 pt-6">
      {leading}
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 className={`truncate ${TEXT_CLASS.pageTitle}`}>{title}</h1>
        {description && <p className={`shrink-0 ${TEXT_CLASS.meta}`}>· {description}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
