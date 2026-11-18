import { ListVideo } from 'lucide-react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { useMessage } from '../setting/use-message';
import { CardCaption } from './card-caption';
import { VideoCover } from './video-thumbnail';

interface PlaylistCardProps {
  title: string;
  /** In playlist order; the first one is the cover. */
  videos: VideoEntry[];
  onOpen: () => void;
}

export function PlaylistCard({ title, videos, onOpen }: PlaylistCardProps) {
  const videoCountLabel = useMessage().library.videoCount(videos.length);
  const [coverVideo] = videos;

  return (
    <article className="group relative">
      <div className="relative pt-2">
        {/* A sheet peeking out behind the cover marks this as a collection rather than a single video. */}
        <div aria-hidden className="absolute inset-x-3 top-0 h-6 rounded-t-card bg-line-strong" />
        <div className="relative aspect-video overflow-hidden rounded-card bg-sunken transition-shadow duration-(--duration-medium) group-hover:shadow-raised">
          {coverVideo ? (
            <VideoCover video={coverVideo} />
          ) : (
            <div aria-hidden className="flex size-full items-center justify-center text-subtle">
              <ListVideo className="size-7" strokeWidth={1.25} />
            </div>
          )}
          <div aria-hidden className="absolute inset-0 transition-colors group-hover:bg-black/20" />
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-control-sm bg-black/70 px-1.5 py-0.5 text-meta font-medium tabular-nums text-white">
            <ListVideo aria-hidden className="size-3.5" />
            {videos.length}
          </span>
        </div>
      </div>
      <CardCaption title={title} meta={videoCountLabel} onActivate={onOpen} />
    </article>
  );
}
