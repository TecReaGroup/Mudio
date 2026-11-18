import { useState } from 'react';
import { useExternalOpen } from '../feature/launch/use-external-open';
import { FileDropZone } from '../feature/library/file-drop-zone';
import { useVideoLibrary, VideoLibraryProvider } from '../feature/library/video-library-context';
import { SettingProvider } from '../feature/setting/setting-context';
import { HomePage, type HomeSection } from '../page/home/home-page';
import { PlayerPage } from '../page/player/player-page';

type AppRoute =
  | { page: 'home'; section: HomeSection }
  /** playlistIds is snapshotted on entry so the order stays stable while "recent" reshuffles. */
  | { page: 'player'; videoId: string; playlistIds: string[]; returnSection: HomeSection };

function AppShell() {
  const { videos } = useVideoLibrary();
  const [route, setRoute] = useState<AppRoute>({ page: 'home', section: 'all' });

  const play = (videoId: string, playlistIds: string[]) => setRoute(current => ({
    page: 'player',
    videoId,
    playlistIds,
    returnSection: current.page === 'home' ? current.section : current.returnSection,
  }));

  // Several opened files form their own playlist; a single file plays ahead of the whole library.
  const playOpened = (openedIds: string[]) => {
    const [firstId] = openedIds;
    const playlistIds = openedIds.length > 1
      ? openedIds
      : [firstId, ...videos.map(video => video.id).filter(id => id !== firstId)];
    play(firstId, playlistIds);
  };

  useExternalOpen(videoId => playOpened([videoId]));

  return (
    <FileDropZone onImported={opened => playOpened(opened.map(video => video.id))}>
      {route.page === 'home' ? (
        <HomePage
          section={route.section}
          onSectionChange={section => setRoute({ page: 'home', section })}
          onPlay={play}
          onOpened={playOpened}
        />
      ) : (
        <PlayerPage
          videoId={route.videoId}
          playlistIds={route.playlistIds}
          onSelectVideo={videoId => setRoute({ ...route, videoId })}
          onBack={() => setRoute({ page: 'home', section: route.returnSection })}
        />
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
