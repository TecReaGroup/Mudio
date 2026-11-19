import { useState } from 'react';
import { VideoLibraryProvider } from '../feature/library/video-library-context';
import { usePlaybackRequest } from '../feature/player/use-playback-request';
import { SettingProvider } from '../feature/setting/setting-context';
import { PlayerPage } from '../page/player/player-page';
import type { PlaybackRequest } from '../shared/contract/mudio-contract';

function PlayerShell() {
  const [request, setRequest] = useState<PlaybackRequest | null>(null);
  usePlaybackRequest(setRequest);

  if (!request) return null;
  return (
    <PlayerPage
      videoId={request.videoId}
      playlistIds={request.playlistIds}
      onSelectVideo={videoId => setRequest({ ...request, videoId })}
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
