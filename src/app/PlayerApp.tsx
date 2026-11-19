import { useCallback, useEffect, useRef, useState } from 'react';
import { useVideoLibrary, VideoLibraryProvider } from '../feature/library/video-library-context';
import { usePlaybackRequest } from '../feature/player/use-playback-request';
import { SettingProvider } from '../feature/setting/setting-context';
import { PlayerPage } from '../page/player/player-page';
import type { PlaybackRequest } from '../shared/contract/mudio-contract';
import { moveItem } from '../shared/lib/order';

function PlayerShell() {
  const { arrangeRecent, arrangePlaylist, removeFromRecent } = useVideoLibrary();
  const [request, setRequest] = useState<PlaybackRequest | null>(null);
  // The video loaded without autoplay because the playing one was removed from under it.
  const [pausedVideoId, setPausedVideoId] = useState<string | null>(null);
  usePlaybackRequest(nextRequest => {
    setPausedVideoId(null);
    setRequest(nextRequest);
  });

  // Read at click time, so the callbacks below stay stable.
  const latestRequest = useRef(request);
  useEffect(() => {
    latestRequest.current = request;
  });

  // Stable, so memoized playlist rows do not all re-render on every video switch.
  const selectVideo = useCallback((videoId: string) => {
    setPausedVideoId(null);
    setRequest(current => current && { ...current, videoId });
  }, []);
  // The queue is a snapshot, so it drops the row itself; Recent in the library updates from main's push.
  const removeFromRecentQueue = useCallback((videoId: string) => {
    const current = latestRequest.current!;
    const removedIndex = current.playlistIds.indexOf(videoId);
    const playlistIds = current.playlistIds.filter(id => id !== videoId);
    if (videoId === current.videoId) {
      // The removed slot is now taken by the next video; past the end, fall back to the previous one.
      const replacementId = playlistIds[Math.min(removedIndex, playlistIds.length - 1)];
      setPausedVideoId(replacementId);
      setRequest({ ...current, videoId: replacementId, playlistIds });
    } else {
      setRequest({ ...current, playlistIds });
    }
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
      autoPlay={request.videoId !== pausedVideoId}
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
