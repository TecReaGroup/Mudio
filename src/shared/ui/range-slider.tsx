import type { CSSProperties } from 'react';
import { cn } from '../lib/cn';

interface RangeSliderProps {
  value: number;
  max: number;
  step?: number;
  label: string;
  onValueChange: (value: number) => void;
  /** Pointer pressed on the slider; `onValueChange` calls until `onDragEnd` belong to one drag. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
}

/** Track and thumb follow currentColor, so the slider adapts to any surface via text color. */
export function RangeSlider({ value, max, step = 0.01, label, onValueChange, onDragStart, onDragEnd, className }: RangeSliderProps) {
  const fillPercent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <input
      type="range"
      min={0}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={event => onValueChange(Number(event.target.value))}
      onPointerDown={() => {
        if (!onDragStart) return;
        onDragStart();
        // Listened on window: the native thumb drag keeps going outside the slider, and the release may land anywhere.
        const endDrag = () => {
          window.removeEventListener('pointerup', endDrag);
          window.removeEventListener('pointercancel', endDrag);
          onDragEnd?.();
        };
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
      }}
      className={cn('range-slider no-drag', className)}
      style={{ '--slider-fill': `${fillPercent}%` } as CSSProperties}
    />
  );
}
