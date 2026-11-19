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
  /** Page name beside the back button; matches the ghost button's text so the two read as one breadcrumb. */
  barTitle: 'text-control font-medium text-secondary',
  groupLabel: 'text-caption font-medium uppercase tracking-wider text-subtle',
} as const;
