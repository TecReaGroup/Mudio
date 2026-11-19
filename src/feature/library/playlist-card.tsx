import { ListVideo } from 'lucide-react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { MediaBadge } from '../../shared/ui/media-badge';
import { useMessage } from '../setting/use-message';
import { CardCaption } from './card-caption';
import { CardCover } from './card-cover';
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
        <CardCover badge={<MediaBadge><ListVideo aria-hidden />{videos.length}</MediaBadge>}>
          {coverVideo ? (
            <VideoCover video={coverVideo} />
          ) : (
            <div aria-hidden className="flex size-full items-center justify-center text-subtle">
              <ListVideo className="size-7" strokeWidth={1.25} />
            </div>
          )}
        </CardCover>
      </div>
      <CardCaption title={title} meta={videoCountLabel} onActivate={onOpen} />
    </article>
  );
}
