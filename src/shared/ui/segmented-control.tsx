import { cn } from '../lib/cn';

interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

interface SegmentedControlProps<Value extends string> {
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
}

export function SegmentedControl<Value extends string>({ options, value, onValueChange }: SegmentedControlProps<Value>) {
  return (
    <div role="radiogroup" className="no-drag inline-flex rounded-lg bg-muted p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onValueChange(option.value)}
          className={cn(
            'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors',
            option.value === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
