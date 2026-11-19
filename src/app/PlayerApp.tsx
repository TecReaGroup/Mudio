import { useCallback, useState } from 'react';
import { useVideoLibrary, VideoLibraryProvider } from '../feature/library/video-library-context';
import { usePlaybackRequest } from '../feature/player/use-playback-request';
import { SettingProvider } from '../feature/setting/setting-context';
import { PlayerPage } from '../page/player/player-page';
import type { PlaybackRequest } from '../shared/contract/mudio-contract';
import { moveItem } from '../shared/lib/order';

function PlayerShell() {
  const { arrangeRecent, arrangePlaylist, removeFromRecent } = useVideoLibrary();
  const [request, setRequest] = useState<PlaybackRequest | null>(null);
  usePlaybackRequest(setRequest);
  // Stable, so memoized playlist rows do not all re-render on every video switch.
  const selectVideo = useCallback(
    (videoId: string) => setRequest(current => current && { ...current, videoId }),
    [],
  );
  // The queue is a snapshot, so it drops the row itself; Recent in the library updates from main's push.
  const removeFromRecentQueue = useCallback((videoId: string) => {
    setRequest(current => current && { ...current, playlistIds: current.playlistIds.filter(id => id !== videoId) });
    removeFromRecent(videoId);
  }, [removeFromRecent]);

  if (!request) return null;

  // The queue's order is saved back to where it came from: its playlist, or Recent.
  const moveVideo = (movedId: string, targetId: string) => {
    const playlistIds = moveItem(request.playlistIds, movedId, targetId);
    setRequest({ ...request, playlistIds });
    if (request.playlistId === null) arrangeRecent(playlistIds);
    else arrangePlaylist(request.playlistId, playlistIds);
  };

  return (
    <PlayerPage
      videoId={request.videoId}
      playlistIds={request.playlistIds}
      playlistTitle={request.playlistTitle}
      onSelectVideo={selectVideo}
      onMoveVideo={moveVideo}
      onRemoveVideo={request.playlistId === null ? removeFromRecentQueue : undefined}
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
