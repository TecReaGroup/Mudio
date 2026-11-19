import type { ReactNode } from 'react';
import { TEXT_CLASS } from '../../shared/ui/text-class';

// NOTE: Toggles display rather than opacity so hidden buttons free their width; focus on the title button reveals them for keyboard users.
// An opacity transition cannot run from display:none, so `starting:` supplies the frame it fades in from.
const ACTION_REVEAL_CLASS =
  'flex [@media(hover:hover)]:hidden group-hover:flex group-has-[:focus-visible]:flex transition-opacity starting:opacity-0';

interface CardCaptionProps {
  title: string;
  meta: string;
  tooltip?: string;
  onActivate: () => void;
  /** Buttons at the title's right edge; they sit above the card-wide click target. */
  actions?: ReactNode;
}

/** Title and meta under a card cover. Must sit inside a `relative` card: its button covers the whole card. */
export function CardCaption({ title, meta, tooltip, onActivate, actions }: CardCaptionProps) {
  return (
    <div className="flex items-center gap-1 px-0.5 pt-3">
      <div className="min-w-0 flex-1">
        <h3 className={`truncate ${TEXT_CLASS.cardTitle}`}>
          {/* The pseudo-element stretches the click target over the whole card. */}
          <button
            type="button"
            onClick={onActivate}
            title={tooltip}
            className="cursor-pointer text-left outline-none after:absolute after:-inset-1.5 after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
          >
            {title}
          </button>
        </h3>
        <p className={`mt-1 truncate ${TEXT_CLASS.bodySecondary}`}>{meta}</p>
      </div>
      {/* Takes no space until revealed, so a long title keeps the full width and only truncates while the buttons show.
          `relative` lifts the buttons above the card-wide click target. */}
      {actions && <div className={`relative -mr-1 shrink-0 items-center gap-0.5 ${ACTION_REVEAL_CLASS}`}>{actions}</div>}
    </div>
  );
}
