import { Play, X } from 'lucide-react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { formatFileSize } from '../../shared/lib/format';
import { VideoThumbnail } from './video-thumbnail';

interface VideoCardProps {
  video: VideoEntry;
  onPlay: () => void;
  onRemove: () => void;
}

export function VideoCard({ video, onPlay, onRemove }: VideoCardProps) {
  const watchedPercent = video.durationSec ? Math.min(100, (video.resumePositionSec / video.durationSec) * 100) : 0;

  return (
    <div className="group relative">
      <button type="button" onClick={onPlay} className="block w-full cursor-pointer text-left" title={video.filePath}>
        <div className="relative">
          <VideoThumbnail video={video} className="rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/25">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow transition-opacity group-hover:opacity-100">
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
          </div>
          {watchedPercent > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-lg bg-white/30">
              <div className="h-full bg-white" style={{ width: `${watchedPercent}%` }} />
            </div>
          )}
        </div>
        <p className="mt-2 truncate text-sm font-medium">{video.title}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(video.sizeBytes)}</p>
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="从视频库移除"
        aria-label="从视频库移除"
        className="absolute right-1.5 top-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
