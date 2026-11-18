import { ListVideo } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useVideoLibrary } from '../../feature/library/video-library-context';
import { PlaylistPanel } from '../../feature/player/playlist-panel';
import { VideoPlayer } from '../../feature/player/video-player';
import { useSetting } from '../../feature/setting/setting-context';
import { useMessage } from '../../feature/setting/use-message';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { BackTitleBar } from '../../shared/ui/back-title-bar';
import { IconButton } from '../../shared/ui/button';

const PLAYLIST_PANEL_ID = 'player-playlist';
// Below this width the playlist becomes an overlay drawer, so it starts closed there.
const SIDE_BY_SIDE_QUERY = '(min-width: 1024px)';

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
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(() => window.matchMedia(SIDE_BY_SIDE_QUERY).matches);
  const video = findVideo(videoId);
  const playlist = useMemo(
    () => playlistIds.map(findVideo).filter((entry): entry is VideoEntry => entry !== undefined),
    [playlistIds, findVideo],
  );
  const currentIndex = playlist.findIndex(entry => entry.id === videoId);
  const previousVideo = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;
  const nextVideo = currentIndex >= 0 ? playlist[currentIndex + 1] : undefined;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <BackTitleBar
        backLabel={message.common.back}
        title={video?.title}
        onBack={onBack}
        actions={(
          <IconButton
            label={message.player.playlist}
            aria-pressed={isPlaylistOpen}
            aria-controls={PLAYLIST_PANEL_ID}
            onClick={() => setIsPlaylistOpen(isOpen => !isOpen)}
          >
            <ListVideo />
          </IconButton>
        )}
      />
      <div className="relative flex min-h-0 flex-1 gap-2 px-2 pb-2">
        <section className="min-w-0 flex-1 overflow-hidden rounded-card bg-black shadow-rest">
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
        <PlaylistPanel
          id={PLAYLIST_PANEL_ID}
          isOpen={isPlaylistOpen}
          videos={playlist}
          currentVideoId={videoId}
          onSelect={onSelectVideo}
          onClose={() => setIsPlaylistOpen(false)}
        />
      </div>
    </div>
  );
}
