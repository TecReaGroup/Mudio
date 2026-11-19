import { useCallback, useState } from 'react';
import { VideoLibraryProvider } from '../feature/library/video-library-context';
import { usePlaybackRequest } from '../feature/player/use-playback-request';
import { SettingProvider } from '../feature/setting/setting-context';
import { PlayerPage } from '../page/player/player-page';
import type { PlaybackRequest } from '../shared/contract/mudio-contract';

function PlayerShell() {
  const [request, setRequest] = useState<PlaybackRequest | null>(null);
  usePlaybackRequest(setRequest);
  // Stable, so memoized playlist rows do not all re-render on every video switch.
  const selectVideo = useCallback(
    (videoId: string) => setRequest(current => current && { ...current, videoId }),
    [],
  );

  if (!request) return null;
  return (
    <PlayerPage
      videoId={request.videoId}
      playlistIds={request.playlistIds}
      onSelectVideo={selectVideo}
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
