import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { describeVideoFile } from '../library/video-file-meta';

const FADE_CLASS = 'pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-long ease-in-out';

export interface FrameSize {
  width: number;
  height: number;
}

interface PlayerTopBarProps {
  video: VideoEntry;
  /** Known once the video's metadata loads; until then only the file facts show. */
  frameSize: FrameSize | undefined;
  isVisible: boolean;
}

/** Title overlay; shows and hides together with the bottom controls. */
export function PlayerTopBar({ video, frameSize, isVisible }: PlayerTopBarProps) {
  const visibilityClass = isVisible ? 'opacity-100' : 'opacity-0';
  const meta = [describeVideoFile(video), frameSize && `${frameSize.width}×${frameSize.height}`].filter(Boolean).join(' · ');
  // NOTE: The scrim is a sibling, not a parent, of the text, or the mask that softens its edge would clip the text.
  // No backdrop blur: over playing video it re-blurs every frame, while a translucent gradient costs nearly nothing.
  return (
    <>
      <div
        aria-hidden
        className={cn(
          FADE_CLASS,
          'h-28 bg-linear-to-b from-black/60 to-transparent mask-[linear-gradient(to_bottom,black_45%,transparent)]',
          visibilityClass,
        )}
      />
      <div className={cn(FADE_CLASS, 'flex items-baseline gap-3 px-6 pt-5 text-white', visibilityClass)}>
        <h2 className="min-w-0 truncate text-title-lg font-semibold" title={video.title}>{video.title}</h2>
        <span className="shrink-0 text-body text-white/70">{meta}</span>
      </div>
    </>
  );
}
