import { useCallback, useState } from 'react';
import { useVideoLibrary, VideoLibraryProvider } from '../feature/library/video-library-context';
import { usePlaybackRequest } from '../feature/player/use-playback-request';
import { SettingProvider } from '../feature/setting/setting-context';
import { PlayerPage } from '../page/player/player-page';
import type { PlaybackRequest } from '../shared/contract/mudio-contract';
import { moveItem } from '../shared/lib/order';

function PlayerShell() {
  const { arrangeRecent } = useVideoLibrary();
  const [request, setRequest] = useState<PlaybackRequest | null>(null);
  usePlaybackRequest(setRequest);
  // Stable, so memoized playlist rows do not all re-render on every video switch.
  const selectVideo = useCallback(
    (videoId: string) => setRequest(current => current && { ...current, videoId }),
    [],
  );

  if (!request) return null;

  // NOTE: Every queue is Recent until user playlists exist, so its order is saved back as Recent's.
  const moveVideo = (movedId: string, targetId: string) => {
    const playlistIds = moveItem(request.playlistIds, movedId, targetId);
    setRequest({ ...request, playlistIds });
    arrangeRecent(playlistIds);
  };

  return (
    <PlayerPage
      videoId={request.videoId}
      playlistIds={request.playlistIds}
      playlistTitle={request.playlistTitle}
      onSelectVideo={selectVideo}
      onMoveVideo={moveVideo}
    />
  );
}

/** Root of the standalone player window. */
export function PlayerApp() {
  return (
    <SettingProvider>
      <VideoLibraryProvider>
        <PlayerShell />
      </VideoLibraryProvider>
    </SettingProvider>
  );
}
