import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const VARIANT_CLASS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/85',
  outline: 'border border-border bg-background hover:bg-accent',
  ghost: 'hover:bg-accent',
} as const;

const SIZE_CLASS = {
  md: 'h-8 gap-1.5 px-3 text-sm',
  icon: 'size-8',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASS;
  size?: keyof typeof SIZE_CLASS;
}

export function Button({ variant = 'ghost', size = 'md', type = 'button', className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'no-drag inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    />
  );
}
