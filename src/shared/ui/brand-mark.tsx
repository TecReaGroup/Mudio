import { useId } from 'react';

// Facets are shaded toward black rather than faded, so the mark stays solid over video.
const LIT_FACET_FILL = 'color-mix(in srgb, currentColor 76%, black)';
const UPPER_FACET_FILL = 'color-mix(in srgb, currentColor 62%, black)';
const LOWER_FACET_FILL = 'color-mix(in srgb, currentColor 36%, black)';
// Triangle outline with each outer corner eased by a quadratic curve 30 units back along both edges.
const ROUNDED_OUTLINE = 'M362 320 Q362 290 388 305 L726 497 Q752 512 726 527 L388 719 Q362 734 362 704 Z';

/** Monochrome faceted play mark from the app icon; follows currentColor. */
export function BrandMark({ layoutClassName }: { layoutClassName?: string }) {
  // Several marks can be mounted at once; a shared clip id would make them clip each other.
  const clipId = useId();
  return (
    <svg aria-hidden viewBox="355 285 405 455" fill="currentColor" className={layoutClassName}>
      <clipPath id={clipId}>
        <path d={ROUNDED_OUTLINE} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path d="M362 290 L505 512 L362 734 Z" style={{ fill: LIT_FACET_FILL }} />
        <path d="M362 290 L752 512 L505 512 Z" style={{ fill: UPPER_FACET_FILL }} />
        <path d="M505 512 L752 512 L362 734 Z" style={{ fill: LOWER_FACET_FILL }} />
      </g>
    </svg>
  );
}
