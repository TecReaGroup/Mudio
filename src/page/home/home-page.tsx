import { Clock, Film, Settings, type LucideIcon } from 'lucide-react';
import { LibraryView } from '../../feature/library/library-view';
import { LIBRARY_SECTION_TITLE, selectSectionVideos, type LibrarySection } from '../../feature/library/library-section';
import { useVideoLibrary } from '../../feature/library/video-library-context';
import { SettingPanel } from '../../feature/setting/setting-panel';
import { cn } from '../../shared/lib/cn';

export type HomeSection = LibrarySection | 'setting';

const LIBRARY_NAV: readonly { section: LibrarySection; icon: LucideIcon }[] = [
  { section: 'all', icon: Film },
  { section: 'recent', icon: Clock },
];

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

function SidebarItem({ icon: Icon, label, count, isActive, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'no-drag flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
        isActive ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
    </button>
  );
}

interface HomePageProps {
  section: HomeSection;
  onSectionChange: (section: HomeSection) => void;
  onPlay: (videoId: string, playlistIds: string[]) => void;
  onOpened: (videoIds: string[]) => void;
}

export function HomePage({ section, onSectionChange, onPlay, onOpened }: HomePageProps) {
  const { videos } = useVideoLibrary();

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="drag-region flex h-16 shrink-0 items-center pl-[max(20px,var(--titlebar-inset-start))]">
          <span className="text-base font-semibold tracking-tight">Mudio</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-medium text-muted-foreground">视频库</p>
          {LIBRARY_NAV.map(({ section: navSection, icon }) => (
            <SidebarItem
              key={navSection}
              icon={icon}
              label={LIBRARY_SECTION_TITLE[navSection]}
              count={selectSectionVideos(videos, navSection).length}
              isActive={section === navSection}
              onClick={() => onSectionChange(navSection)}
            />
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <SidebarItem icon={Settings} label="设置" isActive={section === 'setting'} onClick={() => onSectionChange('setting')} />
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {section === 'setting' ? <SettingPanel /> : <LibraryView section={section} onPlay={onPlay} onOpened={onOpened} />}
      </main>
    </div>
  );
}
