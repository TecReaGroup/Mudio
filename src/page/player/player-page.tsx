import { useEffect, useMemo, useState } from 'react';
import { useVideoLibrary } from '../../feature/library/video-library-context';
import { PlaylistPanel } from '../../feature/player/playlist-panel';
import { VideoPlayer } from '../../feature/player/video-player';
import { useSetting } from '../../feature/setting/setting-context';
import { mudio } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { BackButton } from '../../shared/ui/back-button';
import { WindowTitleBar } from '../../shared/ui/window-title-bar';

interface PlayerPageProps {
  videoId: string;
  playlistIds: string[];
  playlistTitle: string;
  onSelectVideo: (videoId: string) => void;
  onMoveVideo: (movedId: string, targetId: string) => void;
}

/** Fills the player window: the root never scrolls; only the playlist panel does. */
export function PlayerPage({ videoId, playlistIds, playlistTitle, onSelectVideo, onMoveVideo }: PlayerPageProps) {
  const { findVideo } = useVideoLibrary();
  const { setting } = useSetting();
  const video = findVideo(videoId);
  // Tracks which video is playing, not a bool: a switched-to video that fails to autoplay must not inherit "playing".
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const playlist = useMemo(
    () => playlistIds.map(findVideo).filter((entry): entry is VideoEntry => entry !== undefined),
    [playlistIds, findVideo],
  );
  const currentIndex = playlist.findIndex(entry => entry.id === videoId);
  const previousVideo = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;
  const nextVideo = currentIndex >= 0 ? playlist[currentIndex + 1] : undefined;

  // Names the taskbar entry after the video so it is distinguishable from the library window.
  const windowTitle = video?.title;
  useEffect(() => {
    if (windowTitle) document.title = windowTitle;
  }, [windowTitle]);

  return (
    <div className="scheme-dark flex h-full flex-col bg-surface text-foreground">
      <WindowTitleBar>
        <BackButton label="Mudio" onBack={mudio.player.returnToLibrary} />
      </WindowTitleBar>
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 bg-canvas">
          {video && (
            <VideoPlayer
              key={video.id}
              layoutClassName="flex-1"
              video={video}
              onPrevious={previousVideo && (() => onSelectVideo(previousVideo.id))}
              onNext={nextVideo && (() => onSelectVideo(nextVideo.id))}
              loop={setting.playbackOrder === 'repeat-one'}
              onPlay={() => setPlayingVideoId(video.id)}
              onPause={() => setPlayingVideoId(null)}
              onEnded={() => {
                if (setting.playbackOrder === 'sequential' && nextVideo) onSelectVideo(nextVideo.id);
              }}
            />
          )}
        </main>
        <PlaylistPanel
          title={playlistTitle}
          videos={playlist}
          currentVideoId={videoId}
          isCurrentPlaying={playingVideoId === videoId}
          onSelect={onSelectVideo}
          onMove={onMoveVideo}
        />
      </div>
    </div>
  );
}
