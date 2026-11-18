import { TEXT_CLASS } from '../../shared/ui/text-class';

interface CardCaptionProps {
  title: string;
  meta: string;
  tooltip?: string;
  onActivate: () => void;
}

/** Title and meta under a card cover. Must sit inside a `relative` card: its button covers the whole card. */
export function CardCaption({ title, meta, tooltip, onActivate }: CardCaptionProps) {
  return (
    <div className="px-0.5 pt-3">
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
  );
}
