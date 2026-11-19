import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { FOCUS_RING_CLASS } from './control-class';

const NAV_ITEM_CLASS = cn(
  'no-drag flex h-10 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-control text-secondary transition-colors',
  'hover:bg-hover hover:text-foreground',
  'aria-[current=page]:bg-inverse aria-[current=page]:font-medium aria-[current=page]:text-on-inverse',
  FOCUS_RING_CLASS,
);

interface NavItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  icon: LucideIcon;
  label: string;
}

/** Selected look is driven by `aria-current="page"`. */
export function NavItem({ icon: Icon, label, ...props }: NavItemProps) {
  return (
    <button type="button" className={NAV_ITEM_CLASS} {...props}>
      <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    </button>
  );
}

export interface NavListEntry<Value extends string> {
  value: Value;
  icon: LucideIcon;
  label: string;
}

interface NavListProps<Value extends string> {
  label: string;
  entries: readonly NavListEntry<Value>[];
  currentValue: Value;
  onSelect: (value: Value) => void;
}

export function NavList<Value extends string>({ label, entries, currentValue, onSelect }: NavListProps<Value>) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-0.5">
        {entries.map(entry => (
          <li key={entry.value}>
            <NavItem
              icon={entry.icon}
              label={entry.label}
              aria-current={entry.value === currentValue ? 'page' : undefined}
              onClick={() => onSelect(entry.value)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
