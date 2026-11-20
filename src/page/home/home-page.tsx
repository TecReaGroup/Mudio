import { Copy, History, Search, Settings, X, Youtube, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { LibrarySection } from '../../feature/library/library-section';
import { LibraryView } from '../../feature/library/library-view';
import { PlaylistIndexView } from '../../feature/library/playlist-index-view';
import { useMessage } from '../../feature/setting/use-message';
import type { Playlist } from '../../shared/contract/mudio-contract';
import { BrowseShell } from '../../shared/ui/browse-shell';
import { IconButton } from '../../shared/ui/button';
import { cn } from '../../shared/lib/cn';
import { TEXT_FIELD_CLASS } from '../../shared/ui/control-class';
import { NavList } from '../../shared/ui/nav-list';

const LIBRARY_NAV: readonly { section: LibrarySection; icon: LucideIcon }[] = [
  { section: 'recent', icon: History },
  { section: 'all', icon: Youtube },
  { section: 'playlist', icon: Copy },
];

interface HomePageProps {
  section: LibrarySection;
  onSectionChange: (section: LibrarySection) => void;
  onOpenSetting: () => void;
  onPlay: (videoId: string) => void;
  onPlayPlaylist: (playlist: Playlist, startVideoId: string) => void;
}

export function HomePage({ section, onSectionChange, onOpenSetting, onPlay, onPlayPlaylist }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const message = useMessage();

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const navEntries = LIBRARY_NAV.map(({ section: navSection, icon }) => ({
    value: navSection,
    icon,
    label: message.library.sectionTitle[navSection],
  }));

  const searchBox = (
    <label className={cn(TEXT_FIELD_CLASS, 'no-drag flex h-9 w-full items-center gap-2 pr-1 text-secondary')}>
      <Search aria-hidden className="size-4 shrink-0" />
      <input
        ref={searchInputRef}
        type="search"
        value={searchQuery}
        onChange={event => setSearchQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape' && searchQuery) {
            event.preventDefault();
            setSearchQuery('');
          }
        }}
        aria-label={message.library.searchPlaceholder}
        placeholder={message.library.searchPlaceholder}
        className="min-w-0 flex-1 bg-transparent text-control text-foreground outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:appearance-none"
      />
      {searchQuery && (
        <IconButton size="sm" label={message.library.clearSearch} onClick={clearSearch}>
          <X />
        </IconButton>
      )}
    </label>
  );

  return (
    <BrowseShell
      topBarCenter={searchBox}
      sidebar={<NavList label={message.library.navTitle} entries={navEntries} currentValue={section} onSelect={onSectionChange} />}
      sidebarFooter={(
        <IconButton size="lg" label={message.common.setting} layoutClassName="self-start" onClick={onOpenSetting}>
          <Settings strokeWidth={1.75} />
        </IconButton>
      )}
    >
      {section === 'playlist' ? (
        <PlaylistIndexView onPlayPlaylist={onPlayPlaylist} />
      ) : (
        <LibraryView
          collection={section}
          searchQuery={searchQuery}
          onClearSearch={clearSearch}
          onPlay={onPlay}
        />
      )}
    </BrowseShell>
  );
}
