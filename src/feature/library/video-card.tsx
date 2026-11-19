import { Play } from 'lucide-react';
import { memo } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { CardCaption } from './card-caption';
import { describeVideoFile } from './video-file-meta';
import { VideoThumbnail } from './video-thumbnail';

interface VideoCardProps {
  video: VideoEntry;
  /** Must be stable across renders, or memoization is lost for the whole grid. */
  onPlay: (videoId: string) => void;
}

export const VideoCard = memo(function VideoCard({ video, onPlay }: VideoCardProps) {
  return (
    <article className="group relative">
      <div className="relative">
        <VideoThumbnail
          video={video}
          layoutClassName="rounded-card transition-shadow duration-(--duration-medium) group-hover:shadow-raised in-data-dragging:shadow-overlay"
        />
        <div aria-hidden className="absolute inset-0 flex items-center justify-center rounded-card transition-colors group-hover:bg-black/20">
          <span className="flex size-12 scale-90 items-center justify-center rounded-full bg-white/95 text-black opacity-0 shadow-raised transition-[opacity,scale] duration-(--duration-medium) group-hover:scale-100 group-hover:opacity-100">
            <Play className="ml-0.5 size-5 fill-current" />
          </span>
        </div>
      </div>
      <CardCaption title={video.title} meta={describeVideoFile(video)} tooltip={video.filePath} onActivate={() => onPlay(video.id)} />
    </article>
  );
});
