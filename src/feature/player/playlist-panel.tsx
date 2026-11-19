import { AudioLines, Repeat, Repeat1, type LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { PlaybackOrder, VideoEntry } from '../../shared/contract/mudio-contract';
import { IconButton } from '../../shared/ui/button';
import { cn } from '../../shared/lib/cn';
import { FOCUS_RING_CLASS } from '../../shared/ui/control-class';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { describeVideoFile } from '../library/video-file-meta';
import { VideoThumbnail } from '../library/video-thumbnail';
import { useSetting } from '../setting/setting-context';
import { useMessage } from '../setting/use-message';
import { CircleFadingPlay } from './circle-fading-play-icon';

const PLAYBACK_ORDER_ICON: Record<PlaybackOrder, LucideIcon> = {
  'play-once': CircleFadingPlay,
  'repeat-one': Repeat1,
  sequential: Repeat,
};

const NEXT_PLAYBACK_ORDER: Record<PlaybackOrder, PlaybackOrder> = {
  sequential: 'repeat-one',
  'repeat-one': 'play-once',
  'play-once': 'sequential',
};

/** Cycles through the orders on each click; the icon and tooltip name the current one. */
function PlaybackOrderButton() {
  const { setting, updateSetting } = useSetting();
  const message = useMessage().player;
  const order = setting.playbackOrder;
  const Icon = PLAYBACK_ORDER_ICON[order];

  return (
    <IconButton
      size="lg"
      label={`${message.playbackOrder}: ${message.playbackOrderName[order]}`}
      onClick={() => updateSetting({ playbackOrder: NEXT_PLAYBACK_ORDER[order] })}
    >
      <Icon aria-hidden />
    </IconButton>
  );
}

interface PlaylistPanelProps {
  videos: VideoEntry[];
  currentVideoId: string;
  onSelect: (videoId: string) => void;
}

/** Always-visible sidebar beside the video, spanning the full height below the title bar. */
export function PlaylistPanel({ videos, currentVideoId, onSelect }: PlaylistPanelProps) {
  const message = useMessage();
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const currentIndex = videos.findIndex(video => video.id === currentVideoId);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentVideoId]);

  return (
    <aside
      aria-label={message.player.playlist}
      className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-line bg-surface xl:w-96"
    >
      <header className="mx-5 flex shrink-0 items-center justify-between gap-3 border-b border-line pb-4 pt-5">
        <h2 className={TEXT_CLASS.dialogTitle}>{message.player.playlist}</h2>
        <div className="flex items-center gap-2">
          <PlaybackOrderButton />
          <span className="text-control tabular-nums text-subtle">
            <span className="font-semibold text-foreground">{currentIndex + 1}</span> / {videos.length}
          </span>
        </div>
      </header>
      <ol className="scrollbar-subtle min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {videos.map((video, index) => {
          const isCurrent = video.id === currentVideoId;
          return (
            <li key={video.id}>
              <button
                ref={isCurrent ? currentItemRef : undefined}
                type="button"
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => onSelect(video.id)}
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-3 rounded-card p-2 text-left transition-colors hover:bg-hover aria-[current=true]:bg-sunken aria-[current=true]:ring-1 aria-[current=true]:ring-line-strong',
                  FOCUS_RING_CLASS,
                )}
              >
                <span className="flex w-5 shrink-0 justify-center text-meta tabular-nums text-subtle">
                  {isCurrent
                    ? <AudioLines aria-label={message.player.nowPlaying} className="size-4 text-accent" strokeWidth={2.25} />
                    : index + 1}
                </span>
                <VideoThumbnail video={video} layoutClassName="w-32 shrink-0 xl:w-36" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 wrap-anywhere text-body font-medium text-foreground">{video.title}</p>
                  <p className={`mt-1 truncate ${TEXT_CLASS.meta}`}>{describeVideoFile(video)}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
