import { Pencil, Play, Trash2 } from 'lucide-react';
import { memo } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { IconButton } from '../../shared/ui/button';
import { HOVER_REVEAL_CLASS } from '../../shared/ui/control-class';
import { useMessage } from '../setting/use-message';
import { CardCaption } from './card-caption';
import { describeVideoFile } from './video-file-meta';
import { VideoThumbnail } from './video-thumbnail';

interface VideoCardProps {
  video: VideoEntry;
  /** Callbacks must be stable across renders, or memoization is lost for the whole grid. */
  onPlay: (videoId: string) => void;
  onEdit: (videoId: string) => void;
  /** Only Recent passes this: it forgets the playback record, never the video or its file. */
  onRemoveFromRecent?: (videoId: string) => void;
}

export const VideoCard = memo(function VideoCard({ video, onPlay, onEdit, onRemoveFromRecent }: VideoCardProps) {
  const libraryMessage = useMessage().library;

  const actions = (
    <>
      <IconButton size="md" label={libraryMessage.edit.action} layoutClassName={HOVER_REVEAL_CLASS} onClick={() => onEdit(video.id)}>
        <Pencil />
      </IconButton>
      {onRemoveFromRecent && (
        <IconButton
          size="md"
          tone="quietDanger"
          label={libraryMessage.removeFromRecent}
          layoutClassName={HOVER_REVEAL_CLASS}
          onClick={() => onRemoveFromRecent(video.id)}
        >
          <Trash2 />
        </IconButton>
      )}
    </>
  );

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
      <CardCaption
        title={video.title}
        meta={describeVideoFile(video)}
        tooltip={video.filePath}
        onActivate={() => onPlay(video.id)}
        actions={actions}
      />
    </article>
  );
});
