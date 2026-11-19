import { Repeat, Repeat1, type LucideIcon } from 'lucide-react';
import { memo, useEffect, useRef, type Ref } from 'react';
import type { PlaybackOrder, VideoEntry } from '../../shared/contract/mudio-contract';
import { IconButton } from '../../shared/ui/button';
import { SortableItem, SortableScope } from '../../shared/ui/sortable';
import { cn } from '../../shared/lib/cn';
import { FOCUS_RING_CLASS } from '../../shared/ui/control-class';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { describeVideoFile } from '../library/video-file-meta';
import { VideoThumbnail } from '../library/video-thumbnail';
import { useSetting } from '../setting/setting-context';
import { useMessage } from '../setting/use-message';
import { CircleFadingPlay } from './circle-fading-play-icon';
import { NowPlayingBars } from './now-playing-bars';

const PLAYBACK_ORDER_ICON: Record<PlaybackOrder, LucideIcon> = {
  'play-once': CircleFadingPlay,
  'repeat-one': Repeat1,
  sequential: Repeat,
};

const NEXT_PLAYBACK_ORDER: Record<PlaybackOrder, PlaybackOrder> = {
  sequential: 'repeat-one',
  'repeat-one': 'play-once',
  'play-once': 'sequential',
};

/** Cycles through the orders on each click; the icon and tooltip name the current one. */
function PlaybackOrderButton() {
  const { setting, updateSetting } = useSetting();
  const message = useMessage().player;
  const order = setting.playbackOrder;
  const Icon = PLAYBACK_ORDER_ICON[order];

  return (
    <IconButton
      size="lg"
      label={`${message.playbackOrder}: ${message.playbackOrderName[order]}`}
      onClick={() => updateSetting({ playbackOrder: NEXT_PLAYBACK_ORDER[order] })}
    >
      <Icon aria-hidden />
    </IconButton>
  );
}

interface PlaylistItemProps {
  video: VideoEntry;
  isCurrent: boolean;
  isPlaying: boolean;
  onSelect: (videoId: string) => void;
  ref?: Ref<HTMLButtonElement>;
}

const PlaylistItem = memo(function PlaylistItem({ video, isCurrent, isPlaying, onSelect, ref }: PlaylistItemProps) {
  const message = useMessage().player;
  return (
    <SortableItem id={video.id}>
      <button
        ref={ref}
        type="button"
        aria-current={isCurrent ? 'true' : undefined}
        onClick={() => onSelect(video.id)}
        className={cn(
          'group flex w-full cursor-pointer items-start gap-3 rounded-card p-2 text-left transition-colors hover:bg-hover aria-current:bg-accent-soft in-data-dragging:bg-surface in-data-dragging:shadow-overlay',
          FOCUS_RING_CLASS,
        )}
      >
        <div className="relative w-[42%] max-w-40 shrink-0">
          <VideoThumbnail video={video} />
          {isCurrent && (
            <div className="absolute inset-0 flex items-center justify-center rounded-control bg-black/55">
              <NowPlayingBars isPlaying={isPlaying} label={message.nowPlaying} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="line-clamp-2 wrap-anywhere text-control font-medium text-secondary transition-colors group-hover:text-foreground group-aria-current:text-foreground">
            {video.title}
          </p>
          <p className={cn('mt-1 truncate', TEXT_CLASS.hint)}>{describeVideoFile(video)}</p>
        </div>
      </button>
    </SortableItem>
  );
});

interface PlaylistPanelProps {
  title: string;
  videos: VideoEntry[];
  currentVideoId: string;
  isCurrentPlaying: boolean;
  onSelect: (videoId: string) => void;
  /** Called after a row is long-press dragged onto another; the moved row takes the target's slot. */
  onMove: (movedId: string, targetId: string) => void;
}

/**
 * Always-visible sidebar beside the video, spanning the full height below the title bar.
 * Width tracks the window instead of jumping at breakpoints, and thumbnails scale with it.
 */
export function PlaylistPanel({ title, videos, currentVideoId, isCurrentPlaying, onSelect, onMove }: PlaylistPanelProps) {
  const message = useMessage();
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const currentIndex = videos.findIndex(video => video.id === currentVideoId);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentVideoId]);

  return (
    <aside
      aria-label={message.player.playlist}
      className="flex w-[clamp(16rem,26vw,26rem)] shrink-0 flex-col overflow-hidden bg-panel"
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line-subtle pl-4 pr-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className={cn('truncate', TEXT_CLASS.panelTitle)}>{title}</h2>
          <span className="shrink-0 text-meta tabular-nums text-subtle">
            {currentIndex + 1} / {videos.length}
          </span>
        </div>
        <PlaybackOrderButton />
      </header>
      <ol className="scrollbar-subtle min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        <SortableScope itemIds={videos.map(video => video.id)} onMove={onMove}>
          {videos.map(video => {
            const isCurrent = video.id === currentVideoId;
            return (
              <PlaylistItem
                key={video.id}
                ref={isCurrent ? currentItemRef : undefined}
                video={video}
                isCurrent={isCurrent}
                // Only the current row shows playback state; the rest stay untouched on play/pause.
                isPlaying={isCurrent && isCurrentPlaying}
                onSelect={onSelect}
              />
            );
          })}
        </SortableScope>
      </ol>
    </aside>
  );
}
