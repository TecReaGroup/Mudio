/** Keyboard-only focus ring shared by every interactive control. */
export const FOCUS_RING_CLASS =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/** Applied to the container of a text input: accent border plus a soft glow while editing. */
export const INPUT_FOCUS_CLASS =
  'transition-[border-color,box-shadow,background-color] focus-within:border-accent focus-within:bg-surface focus-within:ring-3 focus-within:ring-accent-soft';

/** Card / panel shell: content surface, hairline border, resting shadow. */
export const SURFACE_CLASS = 'rounded-card border border-line bg-surface shadow-rest';

/**
 * Secondary actions inside a `group` (card, list row): hidden until the group is hovered or focused.
 * Only hidden on hover-capable devices so touch users can always reach them.
 * The opacity transition comes from CONTROL_BASE_CLASS.
 */
export const HOVER_REVEAL_CLASS =
  '[@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';

// NOTE: Pressed/expanded state is styled from ARIA attributes so visuals never drift from semantics.
export const BUTTON_TONE_CLASS = {
  primary: 'bg-inverse text-on-inverse shadow-rest hover:bg-inverse/85',
  secondary: 'border border-line bg-surface text-foreground shadow-rest hover:border-line-strong hover:bg-hover',
  ghost:
    'text-secondary hover:bg-hover hover:text-foreground aria-expanded:bg-hover aria-expanded:text-foreground aria-pressed:bg-accent-soft aria-pressed:text-accent',
  quietDanger: 'text-secondary hover:bg-danger-soft hover:text-danger',
  danger: 'bg-danger text-on-danger shadow-rest hover:bg-danger/90',
  inverse: 'text-on-inverse/70 hover:bg-on-inverse/10 hover:text-on-inverse',
  /** Controls drawn over video, which stays dark in every theme. */
  media: 'text-white/90 hover:bg-white/15 hover:text-white',
  mediaPrimary: 'bg-white text-black shadow-raised hover:bg-white/90',
} as const;

export type ButtonTone = keyof typeof BUTTON_TONE_CLASS;

export const BUTTON_SIZE_CLASS = {
  sm: 'h-7 gap-1 rounded-control-sm px-2 text-meta [&_svg]:size-3.5',
  md: 'h-8 gap-1.5 rounded-control px-3 text-control [&_svg]:size-4',
  lg: 'h-9 gap-2 rounded-control px-3.5 text-control [&_svg]:size-4',
  xl: 'h-10 gap-2 rounded-control px-4 text-body [&_svg]:size-4.5',
} as const;

export const ICON_BUTTON_SIZE_CLASS = {
  sm: 'size-7 rounded-control-sm [&_svg]:size-3.5',
  md: 'size-8 rounded-control [&_svg]:size-4',
  lg: 'size-9 rounded-control [&_svg]:size-4.5',
  xl: 'size-10 rounded-control [&_svg]:size-5',
} as const;

export type ControlSize = keyof typeof BUTTON_SIZE_CLASS;

export const CONTROL_BASE_CLASS =
  'no-drag inline-flex shrink-0 cursor-pointer select-none items-center justify-center font-medium transition-[color,background-color,border-color,box-shadow,opacity] disabled:pointer-events-none disabled:opacity-40';
