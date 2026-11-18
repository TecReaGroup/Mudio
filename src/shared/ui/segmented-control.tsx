import { useRef, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';
import { FOCUS_RING_CLASS } from './control-class';

const ARROW_STEP: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

interface SegmentedControlProps<Value extends string> {
  label: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
}

/** Radio group with roving focus: Tab enters on the checked option, arrows move and select. */
export function SegmentedControl<Value extends string>({ label, options, value, onValueChange }: SegmentedControlProps<Value>) {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent) => {
    const step = ARROW_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const currentIndex = options.findIndex(option => option.value === value);
    const nextIndex = (currentIndex + step + options.length) % options.length;
    onValueChange(options[nextIndex].value);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="no-drag inline-flex shrink-0 rounded-control bg-sunken p-0.5">
      {options.map((option, index) => {
        const isChecked = option.value === value;
        return (
          <button
            key={option.value}
            ref={element => { optionRefs.current[index] = element; }}
            type="button"
            role="radio"
            aria-checked={isChecked}
            tabIndex={isChecked ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'cursor-pointer whitespace-nowrap rounded-control-sm px-3 py-1 text-meta font-medium text-secondary transition-[color,background-color,box-shadow]',
              'hover:text-foreground aria-checked:bg-surface aria-checked:text-foreground aria-checked:shadow-rest',
              FOCUS_RING_CLASS,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
