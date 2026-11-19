import { useEffect, useMemo } from 'react';
import { useVideoLibrary } from '../../feature/library/video-library-context';
import { PlaylistPanel } from '../../feature/player/playlist-panel';
import { VideoPlayer } from '../../feature/player/video-player';
import { useSetting } from '../../feature/setting/setting-context';
import { useMessage } from '../../feature/setting/use-message';
import { mudio } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { BackTitleBar } from '../../shared/ui/back-title-bar';

interface PlayerPageProps {
  videoId: string;
  playlistIds: string[];
  onSelectVideo: (videoId: string) => void;
  onBack: () => void;
}

/** Work shell: the root never scrolls; only the playlist panel does. */
export function PlayerPage({ videoId, playlistIds, onSelectVideo, onBack }: PlayerPageProps) {
  const { findVideo } = useVideoLibrary();
  const { setting } = useSetting();
  const message = useMessage();
  const video = findVideo(videoId);
  const playlist = useMemo(
    () => playlistIds.map(findVideo).filter((entry): entry is VideoEntry => entry !== undefined),
    [playlistIds, findVideo],
  );
  const currentIndex = playlist.findIndex(entry => entry.id === videoId);
  const previousVideo = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;
  const nextVideo = currentIndex >= 0 ? playlist[currentIndex + 1] : undefined;

  // The page is dark, so the native caption buttons must be too while it is shown.
  useEffect(() => {
    mudio.window.setCaptionScheme('dark');
    return () => mudio.window.setCaptionScheme('light');
  }, []);

  return (
    <div className="scheme-dark flex h-full flex-col bg-canvas text-foreground">
      <BackTitleBar backLabel={message.common.back} title={message.player.pageTitle} onBack={onBack} />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 bg-black">
          {video && (
            <VideoPlayer
              key={video.id}
              layoutClassName="flex-1"
              video={video}
              onPrevious={previousVideo && (() => onSelectVideo(previousVideo.id))}
              onNext={nextVideo && (() => onSelectVideo(nextVideo.id))}
              onEnded={() => {
                if (setting.autoplayNext && nextVideo) onSelectVideo(nextVideo.id);
              }}
            />
          )}
        </main>
        <PlaylistPanel videos={playlist} currentVideoId={videoId} onSelect={onSelectVideo} />
      </div>
    </div>
  );
}
