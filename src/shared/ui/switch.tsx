import { cn } from '../lib/cn';
import { FOCUS_RING_CLASS } from './control-class';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onCheckedChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'group no-drag relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-line-strong transition-colors aria-checked:bg-accent',
        FOCUS_RING_CLASS,
      )}
    >
      <span className="size-4 translate-x-0.5 rounded-full bg-white shadow-rest transition-transform duration-(--duration-medium) group-aria-checked:translate-x-4.5" />
    </button>
  );
}
