import { CircleAlert, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { TEXT_CLASS } from './text-class';

export function Spinner({ layoutClassName }: { layoutClassName?: string }) {
  return <LoaderCircle aria-hidden className={cn('animate-spin', layoutClassName)} />;
}

interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
}

/** Page-level empty / no-result state: centered, quiet, no decorative illustration. */
export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-60 animate-fade-in flex-col items-center justify-center px-6 pb-16 text-center">
      <p className={TEXT_CLASS.label}>{title}</p>
      {hint && <p className={`mt-1.5 max-w-sm ${TEXT_CLASS.meta}`}>{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  /** Full error text, shown as a tooltip because the banner truncates. */
  detail?: string;
}

/** Page-level error at the top of the content area; never blocks the rest of the page. */
export function ErrorBanner({ message, detail }: ErrorBannerProps) {
  return (
    <div role="alert" title={detail} className="mt-4 flex items-center gap-2 rounded-control bg-danger-soft px-3 py-2 text-control text-danger">
      <CircleAlert aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{detail ? `${message}: ${detail}` : message}</span>
    </div>
  );
}
