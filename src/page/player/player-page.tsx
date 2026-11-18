import { ChevronLeft } from 'lucide-react';
import { useMemo } from 'react';
import { useVideoLibrary } from '../../feature/library/video-library-context';
import { PlaylistPanel } from '../../feature/player/playlist-panel';
import { VideoPlayer } from '../../feature/player/video-player';
import { useSetting } from '../../feature/setting/setting-context';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { Button } from '../../shared/ui/button';

interface PlayerPageProps {
  videoId: string;
  playlistIds: string[];
  onSelectVideo: (videoId: string) => void;
  onBack: () => void;
}

export function PlayerPage({ videoId, playlistIds, onSelectVideo, onBack }: PlayerPageProps) {
  const { findVideo } = useVideoLibrary();
  const { setting } = useSetting();
  const video = findVideo(videoId);
  const playlist = useMemo(
    () => playlistIds.map(findVideo).filter((entry): entry is VideoEntry => entry !== undefined),
    [playlistIds, findVideo],
  );
  const currentIndex = playlist.findIndex(entry => entry.id === videoId);
  const previousVideo = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;
  const nextVideo = currentIndex >= 0 ? playlist[currentIndex + 1] : undefined;

  return (
    <div className="flex h-full flex-col">
      <header className="drag-region flex h-10 shrink-0 items-center gap-1 border-b border-border pl-[max(8px,var(--titlebar-inset-start))] pr-[calc(var(--titlebar-inset-end)+8px)]">
        <Button onClick={onBack} className="h-7 gap-1 px-2 text-xs">
          <ChevronLeft />
          返回
        </Button>
        <h1 className="min-w-0 truncate text-xs font-medium text-muted-foreground">{video?.title}</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 bg-black">
          {video && (
            <VideoPlayer
              key={video.id}
              video={video}
              onPrevious={previousVideo && (() => onSelectVideo(previousVideo.id))}
              onNext={nextVideo && (() => onSelectVideo(nextVideo.id))}
              onEnded={() => {
                if (setting.autoplayNext && nextVideo) onSelectVideo(nextVideo.id);
              }}
            />
          )}
        </section>
        <aside className="w-80 shrink-0 border-l border-border">
          <PlaylistPanel videos={playlist} currentVideoId={videoId} onSelect={onSelectVideo} />
        </aside>
      </div>
    </div>
  );
}
