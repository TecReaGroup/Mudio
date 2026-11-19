import { Pencil, Play, Trash2 } from 'lucide-react';
import { memo } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { IconButton } from '../../shared/ui/button';
import { SortableItem } from '../../shared/ui/sortable';
import { useMessage } from '../setting/use-message';
import { CardCaption } from './card-caption';
import { CardCover } from './card-cover';
import { describeVideoFile } from './video-file-meta';
import { VideoCover, VideoDurationBadge } from './video-thumbnail';

const PLAY_GLYPH = (
  <span className="flex size-12 scale-90 items-center justify-center rounded-full bg-white/95 text-black opacity-0 shadow-raised transition-[opacity,scale] duration-medium group-hover:scale-100 group-hover:opacity-100">
    <Play className="ml-0.5 size-5 fill-current" />
  </span>
);

interface VideoCardProps {
  video: VideoEntry;
  /** Callbacks must be stable across renders, or memoization is lost for the whole grid. */
  onPlay: (videoId: string) => void;
  onEdit: (videoId: string) => void;
  /** Only Recent passes this: it forgets the playback record, never the video or its file. */
  onRemoveFromRecent?: (videoId: string) => void;
}

/** A sortable grid item: the drag wrapper lives inside the memo, so one changed video re-renders one card. */
export const VideoCard = memo(function VideoCard({ video, onPlay, onEdit, onRemoveFromRecent }: VideoCardProps) {
  const libraryMessage = useMessage().library;

  const actions = (
    <>
      <IconButton size="md" label={libraryMessage.edit.action} onClick={() => onEdit(video.id)}>
        <Pencil />
      </IconButton>
      {onRemoveFromRecent && (
        <IconButton size="md" tone="quietDanger" label={libraryMessage.removeFromRecent} onClick={() => onRemoveFromRecent(video.id)}>
          <Trash2 />
        </IconButton>
      )}
    </>
  );

  return (
    <SortableItem id={video.id}>
      <article className="group relative">
        <CardCover hoverGlyph={PLAY_GLYPH} badge={<VideoDurationBadge video={video} />}>
          <VideoCover video={video} />
        </CardCover>
        <CardCaption
          title={video.title}
          meta={describeVideoFile(video)}
          tooltip={video.filePath}
          onActivate={() => onPlay(video.id)}
          actions={actions}
        />
      </article>
    </SortableItem>
  );
});
