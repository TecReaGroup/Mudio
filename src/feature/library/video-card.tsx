import { Play } from 'lucide-react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { formatFileSize } from '../../shared/lib/format';
import { CardCaption } from './card-caption';
import { VideoThumbnail } from './video-thumbnail';

function fileExtension(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.');
  return dotIndex >= 0 ? filePath.slice(dotIndex + 1).toUpperCase() : '';
}

interface VideoCardProps {
  video: VideoEntry;
  onPlay: () => void;
}

export function VideoCard({ video, onPlay }: VideoCardProps) {
  const watchedPercent = video.durationSec ? Math.min(100, (video.resumePositionSec / video.durationSec) * 100) : 0;
  const metaParts = [fileExtension(video.filePath), formatFileSize(video.sizeBytes)].filter(Boolean);

  return (
    <article className="group relative">
      <div className="relative">
        <VideoThumbnail
          video={video}
          layoutClassName="rounded-card transition-shadow duration-(--duration-medium) group-hover:shadow-raised"
        />
        <div aria-hidden className="absolute inset-0 flex items-center justify-center rounded-card transition-colors group-hover:bg-black/20">
          <span className="flex size-12 scale-90 items-center justify-center rounded-full bg-white/95 text-black opacity-0 shadow-raised transition-[opacity,scale] duration-(--duration-medium) group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 size-5 fill-current" />
          </span>
        </div>
        {watchedPercent > 0 && (
          <div aria-hidden className="absolute inset-x-3 bottom-1 h-0.75 overflow-hidden rounded-full bg-white/30">
            <div className="h-full bg-accent" style={{ width: `${watchedPercent}%` }} />
          </div>
        )}
      </div>
      <CardCaption title={video.title} meta={metaParts.join(' · ')} tooltip={video.filePath} onActivate={onPlay} />
    </article>
  );
}
