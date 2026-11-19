import { ChevronDown, Folder, X } from 'lucide-react';
import { useId, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { cn } from '../../shared/lib/cn';
import { DIALOG_TEXT_FIELD_CLASS, FOCUS_RING_CLASS } from '../../shared/ui/control-class';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { useMessage } from '../setting/use-message';

const CHIP_CLASS = 'inline-flex h-7 max-w-full items-center rounded-control-sm bg-accent-soft text-control font-medium text-accent';
/** Matches the dropdown's max-h-56 plus its gap to the field; less room than this below the field flips it upward. */
const DROPDOWN_SPACE_PX = 236;
const OPTION_CLASS =
  'flex h-9 w-full cursor-pointer items-center rounded-control-sm px-2.5 text-left text-control text-foreground transition-colors hover:bg-hover';

/** Clicks on chips, options and padding must not steal focus from the input, or the dropdown would close. */
function keepInputFocus(event: MouseEvent) {
  if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
}

interface PlaylistPickerProps {
  selectedTitles: string[];
  /** Selected titles a library folder holds the video in; they show as chips the user cannot remove here. */
  lockedTitles: string[];
  /** Every playlist that exists, for picking. */
  existingTitles: string[];
  /** Shown under the label, e.g. what picking a playlist applies to. */
  description?: string;
  onChange: (titles: string[]) => void;
}

/**
 * Tag combobox: selected playlists are chips inside the field, and typing in the same field filters
 * the floating dropdown or names a new playlist.
 * NOTE: The host dialog must allow visible overflow, or the dropdown is clipped at its edge.
 */
export function PlaylistPicker({ selectedTitles, lockedTitles, existingTitles, description, onChange }: PlaylistPickerProps) {
  const editMessage = useMessage().library.edit;
  const inputId = useId();
  const listId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(false);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const selected = new Set(selectedTitles);
  const locked = new Set(lockedTitles);
  const removableTitles = selectedTitles.filter(title => !locked.has(title));
  // Picked playlists live as chips in the field, so the dropdown only offers the rest.
  const suggestions = existingTitles.filter(title => !selected.has(title) && title.toLowerCase().includes(normalizedQuery));
  const canCreate = trimmedQuery !== '' && !selected.has(trimmedQuery) && !existingTitles.includes(trimmedQuery);
  const isFirstPlaylist = existingTitles.length === 0 && selectedTitles.length === 0 && !canCreate;

  const select = (title: string) => {
    onChange([...selectedTitles, title]);
    setQuery('');
  };
  const deselect = (title: string) => onChange(selectedTitles.filter(selectedTitle => selectedTitle !== title));
  // Measured on open rather than on every render: the field only moves when the dialog does.
  const open = () => {
    const fieldRect = fieldRef.current!.getBoundingClientRect();
    const spaceBelow = window.innerHeight - fieldRect.bottom;
    setOpensUpward(spaceBelow < DROPDOWN_SPACE_PX && fieldRect.top > spaceBelow);
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  const closeOnFocusLeave = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Enter picks a playlist here; it must not submit the form.
      event.preventDefault();
      if (canCreate) select(trimmedQuery);
      else if (suggestions.length === 1) select(suggestions[0]);
    } else if (event.key === 'Escape' && isOpen) {
      // Only the dropdown closes; a second Escape reaches the dialog.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Backspace' && !query && removableTitles.length > 0) {
      deselect(removableTitles[removableTitles.length - 1]);
    } else if (event.key === 'ArrowDown' && !isOpen) {
      open();
    }
  };

  return (
    <div className="relative" onBlur={closeOnFocusLeave}>
      <label htmlFor={inputId} className={TEXT_CLASS.label}>{editMessage.playlist}</label>
      {description && <p id={descriptionId} className={cn('mb-1 mt-1.5', TEXT_CLASS.hint)}>{description}</p>}
      <div className="relative mt-2">
        <div
          ref={fieldRef}
          onMouseDown={event => {
            keepInputFocus(event);
            inputRef.current!.focus();
          }}
          className={cn('relative flex min-h-10 cursor-text flex-wrap items-center gap-1.5 py-1.5 pl-1.5 pr-9', DIALOG_TEXT_FIELD_CLASS)}
        >
          {lockedTitles.map(title => (
            <span key={title} title={editMessage.folderPlaylist} className={cn(CHIP_CLASS, 'gap-1.5 px-2.5')}>
              <Folder aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{title}</span>
            </span>
          ))}
          {removableTitles.map(title => (
            <span key={title} className={cn(CHIP_CLASS, 'gap-0.5 pl-2.5 pr-0.5')}>
              <span className="truncate">{title}</span>
              <button
                type="button"
                aria-label={editMessage.leavePlaylist(title)}
                title={editMessage.leavePlaylist(title)}
                onClick={() => deselect(title)}
                className={cn('flex size-6 cursor-pointer items-center justify-center rounded-control-sm transition-colors hover:bg-accent/15', FOCUS_RING_CLASS)}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-describedby={description ? descriptionId : undefined}
            autoComplete="off"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              if (!isOpen) open();
            }}
            onFocus={open}
            onKeyDown={onInputKeyDown}
            placeholder={selectedTitles.length === 0 ? editMessage.playlistPlaceholder : undefined}
            className="h-7 min-w-24 flex-1 bg-transparent px-1.5 outline-none placeholder:text-subtle"
          />
          {/* Toggled on mousedown, before the field's own handler refocuses the input and reopens the list.
              Out of the tab order: the input already opens it with ArrowDown and closes it with Escape. */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={editMessage.togglePlaylistOption}
            aria-controls={listId}
            aria-expanded={isOpen}
            onMouseDown={event => {
              event.preventDefault();
              event.stopPropagation();
              if (isOpen) {
                close();
              } else {
                inputRef.current!.focus();
                open();
              }
            }}
            className="absolute right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-control-sm text-subtle transition-colors hover:bg-hover hover:text-foreground"
          >
            <ChevronDown
              aria-hidden
              className={cn('size-4 transition-transform duration-(--duration-medium)', isOpen && 'rotate-180')}
            />
          </button>
        </div>
        {isOpen && (canCreate || suggestions.length > 0 || isFirstPlaylist) && (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable
            onMouseDown={keepInputFocus}
            className={cn(
              'scrollbar-subtle absolute inset-x-0 z-(--layer-dropdown) max-h-56 animate-pop-in overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-overlay',
              opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            )}
          >
            {canCreate && (
              <li role="option" aria-selected={false} onClick={() => select(trimmedQuery)} className={cn(OPTION_CLASS, 'font-medium text-accent')}>
                <span className="truncate">{editMessage.createPlaylist(trimmedQuery)}</span>
              </li>
            )}
            {suggestions.map(title => (
              <li key={title} role="option" aria-selected={false} onClick={() => select(title)} className={OPTION_CLASS}>
                <span className="truncate">{title}</span>
              </li>
            ))}
            {isFirstPlaylist && (
              <li className={cn('px-2.5 py-2', TEXT_CLASS.hint)}>{editMessage.playlistEmptyHint}</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
