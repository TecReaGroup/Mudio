import { useCallback, useEffect, useRef, useState } from 'react';
import { useExternalOpen } from '../feature/launch/use-external-open';
import { FileDropZone } from '../feature/library/file-drop-zone';
import { useVideoLibrary, VideoLibraryProvider } from '../feature/library/video-library-context';
import { SettingProvider } from '../feature/setting/setting-context';
import { useMessage } from '../feature/setting/use-message';
import { buildRecentQueue, type LibrarySection } from '../feature/library/library-section';
import type { PlaybackRequest, Playlist } from '../shared/contract/mudio-contract';
import { HomePage } from '../page/home/home-page';
import { usePosterBackfill } from '../feature/library/use-poster-backfill';
import { SettingPage } from '../page/setting/setting-page';
import { mudio } from '../shared/api/mudio';
import { describeError, log } from '../shared/lib/logger';

type AppRoute =
  | { page: 'home'; section: LibrarySection }
  | { page: 'setting'; returnSection: LibrarySection };

function play(request: PlaybackRequest): void {
  mudio.player.open(request)
    .catch(error => log('error', 'Player', `Failed to open player window: ${describeError(error)}`));
}

function AppShell() {
  const { videos, recentVideos } = useVideoLibrary();
  const recentTitle = useMessage().library.sectionTitle.recent;
  const [route, setRoute] = useState<AppRoute>({ page: 'home', section: 'all' });

  // Main window only: the player window shares the library and would capture the same posters twice.
  usePosterBackfill(videos);

  // Read at click time, so the callbacks stay stable and memoized cards survive every library push.
  const latestRecentVideos = useRef(recentVideos);
  useEffect(() => {
    latestRecentVideos.current = recentVideos;
  });

  // Anything not started from a playlist plays in Recent, jumping to the first opened video where it already sits.
  const playInRecent = useCallback((openedIds: string[]) => play({
    videoId: openedIds[0],
    playlistIds: buildRecentQueue(latestRecentVideos.current.map(video => video.id), openedIds),
    playlistTitle: recentTitle,
    playlistId: null,
  }), [recentTitle]);
  const playPlaylist = useCallback((playlist: Playlist, startVideoId: string) => play({
    videoId: startVideoId,
    playlistIds: playlist.videoIds,
    playlistTitle: playlist.title,
    playlistId: playlist.id,
  }), []);
  const playVideo = useCallback((videoId: string) => playInRecent([videoId]), [playInRecent]);

  useExternalOpen(playVideo);

  return (
    <FileDropZone onImported={opened => playInRecent(opened.map(video => video.id))}>
      {route.page === 'home' && (
        <HomePage
          section={route.section}
          onSectionChange={section => setRoute({ page: 'home', section })}
          onOpenSetting={() => setRoute({ page: 'setting', returnSection: route.section })}
          onPlay={playVideo}
          onPlayPlaylist={playPlaylist}
        />
      )}
      {route.page === 'setting' && (
        <SettingPage onBack={() => setRoute({ page: 'home', section: route.returnSection })} />
      )}
    </FileDropZone>
  );
}

export function App() {
  return (
    <SettingProvider>
      <VideoLibraryProvider>
        <AppShell />
      </VideoLibraryProvider>
    </SettingProvider>
  );
}
