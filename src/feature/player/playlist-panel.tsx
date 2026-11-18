import { useEffect, useRef } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { VideoThumbnail } from '../library/video-thumbnail';

interface PlaylistPanelProps {
  videos: VideoEntry[];
  currentVideoId: string;
  onSelect: (videoId: string) => void;
}

export function PlaylistPanel({ videos, currentVideoId, onSelect }: PlaylistPanelProps) {
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const currentIndex = videos.findIndex(video => video.id === currentVideoId);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentVideoId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold">播放列表</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {currentIndex + 1} / {videos.length}
        </span>
      </div>
      <ol className="flex-1 space-y-1 overflow-y-auto p-2">
        {videos.map(video => {
          const isCurrent = video.id === currentVideoId;
          return (
            <li key={video.id}>
              <button
                ref={isCurrent ? currentItemRef : undefined}
                type="button"
                onClick={() => onSelect(video.id)}
                className={cn(
                  'flex w-full cursor-pointer gap-3 rounded-lg p-2 text-left transition-colors',
                  isCurrent ? 'bg-accent' : 'hover:bg-accent/60',
                )}
              >
                <VideoThumbnail video={video} className="w-28 shrink-0" />
                <div className="min-w-0 flex-1 py-0.5">
                  <p className={cn('line-clamp-2 text-xs leading-snug', isCurrent && 'font-semibold')}>{video.title}</p>
                  {isCurrent && <p className="mt-1 text-[11px] text-muted-foreground">正在播放</p>}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
