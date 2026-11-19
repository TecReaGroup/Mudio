import { Film } from 'lucide-react';
import type { CSSProperties } from 'react';
import { thumbnailUrl } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { formatDuration } from '../../shared/lib/format';
import { MediaBadge } from '../../shared/ui/media-badge';

const PLACEHOLDER_HUE_SPREAD = 40;

/** Stable per-video hue, so a video without a poster keeps the same placeholder everywhere. */
function placeholderHue(videoId: string): number {
  let hash = 0;
  for (const character of videoId) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return hash;
}

function placeholderStyle(videoId: string): CSSProperties {
  const hue = placeholderHue(videoId);
  return {
    backgroundImage: `linear-gradient(135deg, hsl(${hue} 55% 60% / 0.28), hsl(${hue + PLACEHOLDER_HUE_SPREAD} 55% 55% / 0.12))`,
  };
}

/** Poster image, or a stable per-video placeholder; fills its parent. */
export function VideoCover({ video }: { video: VideoEntry }) {
  return video.hasThumbnail ? (
    <img
      src={thumbnailUrl(video.id)}
      alt=""
      draggable={false}
      loading="lazy"
      decoding="async"
      onLoad={event => { event.currentTarget.dataset.loaded = ''; }}
      className="size-full object-cover opacity-0 transition-opacity duration-long data-loaded:opacity-100"
    />
  ) : (
    <div aria-hidden className="flex size-full items-center justify-center text-subtle" style={placeholderStyle(video.id)}>
      <Film className="size-6" strokeWidth={1.25} />
    </div>
  );
}

interface VideoThumbnailProps {
  video: VideoEntry;
  layoutClassName?: string;
}

export function VideoDurationBadge({ video }: { video: VideoEntry }) {
  return video.durationSec !== null && <MediaBadge>{formatDuration(video.durationSec)}</MediaBadge>;
}

export function VideoThumbnail({ video, layoutClassName }: VideoThumbnailProps) {
  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-control bg-sunken', layoutClassName)}>
      <VideoCover video={video} />
      <VideoDurationBadge video={video} />
    </div>
  );
}
