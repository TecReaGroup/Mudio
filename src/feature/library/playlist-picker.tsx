import { Plus, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { cn } from '../../shared/lib/cn';
import { FOCUS_RING_CLASS, TEXT_FIELD_CLASS } from '../../shared/ui/control-class';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { useMessage } from '../setting/use-message';

const CHIP_CLASS = 'inline-flex h-6 max-w-full items-center gap-1 rounded-control-sm text-meta font-medium';

interface PlaylistPickerProps {
  selectedTitles: string[];
  /** Every playlist that exists, for picking. */
  existingTitles: string[];
  onChange: (titles: string[]) => void;
}

/** Tag-style multi-select: typing a new name and pressing Enter creates it; existing playlists are listed below. */
export function PlaylistPicker({ selectedTitles, existingTitles, onChange }: PlaylistPickerProps) {
  const editMessage = useMessage().library.edit;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const selected = new Set(selectedTitles);
  const suggestions = existingTitles.filter(title => !selected.has(title) && title.toLowerCase().includes(normalizedQuery));
  const canCreate = trimmedQuery !== '' && !selected.has(trimmedQuery) && !existingTitles.includes(trimmedQuery);

  const select = (title: string) => {
    if (!selected.has(title)) onChange([...selectedTitles, title]);
    setQuery('');
    inputRef.current?.focus();
  };
  const deselect = (title: string) => onChange(selectedTitles.filter(selectedTitle => selectedTitle !== title));

  return (
    <div>
      <label htmlFor={inputId} className={TEXT_CLASS.label}>{editMessage.playlist}</label>
      {/* Clicking the field's padding still lands in the input, as a single text box would. */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn('mt-1.5 flex min-h-9 cursor-text flex-wrap items-center gap-1 py-1 pl-1.5', TEXT_FIELD_CLASS)}
      >
        {selectedTitles.map(title => (
          <span key={title} className={cn(CHIP_CLASS, 'bg-accent-soft pl-2 pr-0.5 text-foreground')}>
            <span className="truncate">{title}</span>
            <button
              type="button"
              aria-label={editMessage.leavePlaylist(title)}
              title={editMessage.leavePlaylist(title)}
              onClick={() => deselect(title)}
              className={cn('flex size-5 cursor-pointer items-center justify-center rounded-control-sm text-secondary hover:bg-hover hover:text-foreground', FOCUS_RING_CLASS)}
            >
              <X aria-hidden className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && trimmedQuery) {
              // Enter names a playlist here; it must not submit the surrounding form.
              event.preventDefault();
              select(trimmedQuery);
            } else if (event.key === 'Backspace' && !query && selectedTitles.length > 0) {
              deselect(selectedTitles[selectedTitles.length - 1]);
            }
          }}
          placeholder={selectedTitles.length === 0 ? editMessage.playlistPlaceholder : undefined}
          className="h-7 min-w-24 flex-1 bg-transparent px-1.5 outline-none placeholder:text-subtle"
        />
      </div>
      {(canCreate || suggestions.length > 0) && (
        <div className="scrollbar-subtle mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {canCreate && (
            <button
              type="button"
              onClick={() => select(trimmedQuery)}
              className={cn(CHIP_CLASS, 'cursor-pointer border border-dashed border-line-strong px-2 text-foreground hover:bg-hover', FOCUS_RING_CLASS)}
            >
              <Plus aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{editMessage.createPlaylist(trimmedQuery)}</span>
            </button>
          )}
          {suggestions.map(title => (
            <button
              key={title}
              type="button"
              onClick={() => select(title)}
              className={cn(CHIP_CLASS, 'cursor-pointer border border-line px-2 text-secondary hover:bg-hover hover:text-foreground', FOCUS_RING_CLASS)}
            >
              <span className="truncate">{title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
