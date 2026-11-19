import type { ReactNode } from 'react';

interface CardCoverProps {
  /** Fills the frame, e.g. a VideoCover. */
  children: ReactNode;
  /** Centered over the scrim; animates itself with `group-hover:`. */
  hoverGlyph?: ReactNode;
  /** Painted above the scrim so it stays readable while the cover dims. */
  badge?: ReactNode;
}

/** 16:9 cover of a library card. Lifts and dims while its `group` card is hovered. */
export function CardCover({ children, hoverGlyph, badge }: CardCoverProps) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-card bg-sunken transition-shadow duration-medium group-hover:shadow-raised in-data-dragging:shadow-overlay">
      {children}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center transition-colors group-hover:bg-black/20">
        {hoverGlyph}
      </div>
      {badge}
    </div>
  );
}
