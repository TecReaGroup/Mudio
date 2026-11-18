import { Film } from 'lucide-react';
import { thumbnailUrl } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { formatDuration } from '../../shared/lib/format';

export function VideoThumbnail({ video, className }: { video: VideoEntry; className?: string }) {
  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-md bg-muted', className)}>
      {video.hasThumbnail ? (
        <img src={thumbnailUrl(video.id)} alt="" draggable={false} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Film className="size-6" strokeWidth={1.5} />
        </div>
      )}
      {video.durationSec !== null && (
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatDuration(video.durationSec)}
        </span>
      )}
    </div>
  );
}
