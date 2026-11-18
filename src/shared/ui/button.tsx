import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';
import {
  BUTTON_SIZE_CLASS,
  BUTTON_TONE_CLASS,
  CONTROL_BASE_CLASS,
  FOCUS_RING_CLASS,
  ICON_BUTTON_SIZE_CLASS,
  type ButtonTone,
  type ControlSize,
} from './control-class';

/** Callers may only add layout (position, margin, width, visibility); look comes from tone × size. */
interface ControlProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  tone?: ButtonTone;
  size?: ControlSize;
  layoutClassName?: string;
}

export function Button({ tone = 'secondary', size = 'md', type = 'button', layoutClassName, ...props }: ControlProps) {
  return (
    <button
      type={type}
      className={cn(CONTROL_BASE_CLASS, FOCUS_RING_CLASS, BUTTON_TONE_CLASS[tone], BUTTON_SIZE_CLASS[size], layoutClassName)}
      {...props}
    />
  );
}

interface IconButtonProps extends Omit<ControlProps, 'children' | 'aria-label' | 'title'> {
  /** Accessible name, also shown as the hover tooltip. */
  label: string;
  children: ReactNode;
}

export function IconButton({ tone = 'ghost', size = 'md', type = 'button', label, layoutClassName, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(CONTROL_BASE_CLASS, FOCUS_RING_CLASS, BUTTON_TONE_CLASS[tone], ICON_BUTTON_SIZE_CLASS[size], layoutClassName)}
      {...props}
    />
  );
}
