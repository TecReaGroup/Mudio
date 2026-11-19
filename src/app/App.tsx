import { useState } from 'react';
import { useExternalOpen } from '../feature/launch/use-external-open';
import { FileDropZone } from '../feature/library/file-drop-zone';
import { useVideoLibrary, VideoLibraryProvider } from '../feature/library/video-library-context';
import { SettingProvider } from '../feature/setting/setting-context';
import type { LibrarySection } from '../feature/library/library-section';
import { HomePage } from '../page/home/home-page';
import { usePosterBackfill } from '../feature/library/use-poster-backfill';
import { SettingPage } from '../page/setting/setting-page';
import { mudio } from '../shared/api/mudio';
import { describeError, log } from '../shared/lib/logger';

type AppRoute =
  | { page: 'home'; section: LibrarySection }
  | { page: 'setting'; returnSection: LibrarySection };

function play(videoId: string, playlistIds: string[]): void {
  mudio.player.open({ videoId, playlistIds })
    .catch(error => log('error', 'Player', `Failed to open player window: ${describeError(error)}`));
}

function AppShell() {
  const { videos } = useVideoLibrary();
  const [route, setRoute] = useState<AppRoute>({ page: 'home', section: 'all' });

  // Main window only: the player window shares the library and would capture the same posters twice.
  usePosterBackfill(videos);

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
      {route.page === 'home' && (
        <HomePage
          section={route.section}
          onSectionChange={section => setRoute({ page: 'home', section })}
          onOpenSetting={() => setRoute({ page: 'setting', returnSection: route.section })}
          onPlay={play}
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
