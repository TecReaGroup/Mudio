import { AudioLines } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { FOCUS_RING_CLASS } from '../../shared/ui/control-class';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { describeVideoFile } from '../library/video-file-meta';
import { VideoThumbnail } from '../library/video-thumbnail';
import { useMessage } from '../setting/use-message';

interface PlaylistPanelProps {
  videos: VideoEntry[];
  currentVideoId: string;
  onSelect: (videoId: string) => void;
}

/** Always-visible sidebar beside the video, spanning the full height below the title bar. */
export function PlaylistPanel({ videos, currentVideoId, onSelect }: PlaylistPanelProps) {
  const message = useMessage();
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const currentIndex = videos.findIndex(video => video.id === currentVideoId);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentVideoId]);

  return (
    <aside
      aria-label={message.player.playlist}
      className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-line bg-surface xl:w-96"
    >
      <header className="mx-5 flex shrink-0 items-baseline justify-between gap-3 border-b border-line pb-4 pt-5">
        <h2 className={TEXT_CLASS.dialogTitle}>{message.player.playlist}</h2>
        <span className="text-control tabular-nums text-subtle">
          <span className="font-semibold text-foreground">{currentIndex + 1}</span> / {videos.length}
        </span>
      </header>
      <ol className="scrollbar-subtle min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {videos.map((video, index) => {
          const isCurrent = video.id === currentVideoId;
          return (
            <li key={video.id}>
              <button
                ref={isCurrent ? currentItemRef : undefined}
                type="button"
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => onSelect(video.id)}
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-3 rounded-card p-2 text-left transition-colors hover:bg-hover aria-[current=true]:bg-sunken aria-[current=true]:ring-1 aria-[current=true]:ring-line-strong',
                  FOCUS_RING_CLASS,
                )}
              >
                <span className="flex w-5 shrink-0 justify-center text-meta tabular-nums text-subtle">
                  {isCurrent
                    ? <AudioLines aria-label={message.player.nowPlaying} className="size-4 text-accent" strokeWidth={2.25} />
                    : index + 1}
                </span>
                <VideoThumbnail video={video} layoutClassName="w-32 shrink-0 xl:w-36" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 wrap-anywhere text-body font-medium text-foreground">{video.title}</p>
                  <p className={`mt-1 truncate ${TEXT_CLASS.meta}`}>{describeVideoFile(video)}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
