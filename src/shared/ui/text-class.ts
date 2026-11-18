/** Text roles. Add a role here before inventing a new size/weight/color combination at a call site. */
export const TEXT_CLASS = {
  pageTitle: 'text-title-lg font-semibold text-foreground',
  dialogTitle: 'text-title font-semibold text-foreground',
  panelTitle: 'text-title-sm font-semibold text-foreground',
  body: 'text-body text-foreground',
  bodySecondary: 'text-body text-secondary',
  label: 'text-body font-medium text-foreground',
  cardTitle: 'text-title-sm font-semibold text-foreground',
  meta: 'text-meta text-secondary',
  hint: 'text-meta text-subtle',
  groupLabel: 'text-caption font-medium uppercase tracking-wider text-subtle',
} as const;
