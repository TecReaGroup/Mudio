import { AudioLines, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { IconButton } from '../../shared/ui/button';
import { FOCUS_RING_CLASS, SURFACE_CLASS } from '../../shared/ui/control-class';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { VideoThumbnail } from '../library/video-thumbnail';
import { useMessage } from '../setting/use-message';

interface PlaylistPanelProps {
  id: string;
  isOpen: boolean;
  videos: VideoEntry[];
  currentVideoId: string;
  onSelect: (videoId: string) => void;
  onClose: () => void;
}

/**
 * Side panel beside the video on wide windows, an overlay drawer on narrow ones.
 * Closing hides it rather than unmounting, so the list keeps its state.
 */
export function PlaylistPanel({ id, isOpen, videos, currentVideoId, onSelect, onClose }: PlaylistPanelProps) {
  const message = useMessage();
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const currentIndex = videos.findIndex(video => video.id === currentVideoId);

  useEffect(() => {
    if (isOpen) currentItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentVideoId, isOpen]);

  return (
    <aside
      id={id}
      hidden={!isOpen}
      aria-label={message.player.playlist}
      className={cn(
        SURFACE_CLASS,
        'flex w-80 shrink-0 animate-panel-in flex-col overflow-hidden',
        'max-lg:absolute max-lg:inset-y-0 max-lg:right-2 max-lg:z-(--layer-drawer) max-lg:shadow-overlay',
      )}
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line pl-4 pr-2">
        <h2 className={TEXT_CLASS.panelTitle}>{message.player.playlist}</h2>
        <span className="rounded-control-sm bg-sunken px-1.5 py-0.5 text-caption font-medium tabular-nums text-secondary">
          {currentIndex + 1} / {videos.length}
        </span>
        <IconButton size="sm" label={message.common.close} onClick={onClose} layoutClassName="ml-auto">
          <X />
        </IconButton>
      </header>
      <ol className="scrollbar-subtle min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {videos.map(video => {
          const isCurrent = video.id === currentVideoId;
          return (
            <li key={video.id}>
              <button
                ref={isCurrent ? currentItemRef : undefined}
                type="button"
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => onSelect(video.id)}
                className={cn(
                  'group flex w-full cursor-pointer gap-3 rounded-control p-2 text-left transition-colors hover:bg-hover aria-[current=true]:bg-sunken',
                  FOCUS_RING_CLASS,
                )}
              >
                <VideoThumbnail video={video} layoutClassName="w-28 shrink-0" />
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="line-clamp-2 wrap-anywhere text-control text-secondary group-hover:text-foreground group-aria-[current=true]:font-medium group-aria-[current=true]:text-foreground">
                    {video.title}
                  </p>
                  {isCurrent && (
                    <p className="mt-1.5 flex items-center gap-1 text-caption font-medium text-accent">
                      <AudioLines aria-hidden className="size-3" strokeWidth={2.25} />
                      {message.player.nowPlaying}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
