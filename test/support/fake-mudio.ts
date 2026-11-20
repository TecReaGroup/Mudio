import { vi } from 'vitest';
import type {
  AppSetting,
  LibrarySnapshot,
  MudioApi,
  PlaybackRequest,
  Unsubscribe,
} from '../../src/shared/contract/mudio-contract';
import { buildSetting, buildSnapshot } from './fixture';

interface FakeMudioOptions {
  snapshot?: LibrarySnapshot;
  /** Makes library.list() reject, as when library.json cannot be read. */
  libraryLoadError?: Error;
  setting?: AppSetting;
  platform?: string;
  /** Video the OS asked to open before the library window was ready. */
  pendingLaunchVideoId?: string | null;
  /** Request waiting for the player window when it mounts. */
  pendingPlaybackRequest?: PlaybackRequest | null;
}

function subscribe<Payload>(listeners: Set<(payload: Payload) => void>, listener: (payload: Payload) => void): Unsubscribe {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function createFakeApi(options: FakeMudioOptions) {
  const libraryListeners = new Set<(snapshot: LibrarySnapshot) => void>();
  const playListeners = new Set<(request: PlaybackRequest) => void>();
  const snapshot = options.snapshot ?? buildSnapshot();

  const api = {
    platform: options.platform ?? 'win32',
    library: {
      list: vi.fn<MudioApi['library']['list']>(() =>
        options.libraryLoadError ? Promise.reject(options.libraryLoadError) : Promise.resolve(snapshot)),
      importPaths: vi.fn<MudioApi['library']['importPaths']>(async () => []),
      remove: vi.fn<MudioApi['library']['remove']>(async () => undefined),
      arrange: vi.fn<MudioApi['library']['arrange']>(async () => undefined),
      arrangeRecent: vi.fn<MudioApi['library']['arrangeRecent']>(async () => undefined),
      arrangePlaylist: vi.fn<MudioApi['library']['arrangePlaylist']>(async () => undefined),
      editVideo: vi.fn<MudioApi['library']['editVideo']>(async () => undefined),
      removeFromRecent: vi.fn<MudioApi['library']['removeFromRecent']>(async () => undefined),
      recordPlayback: vi.fn<MudioApi['library']['recordPlayback']>(async () => undefined),
      attachPoster: vi.fn<MudioApi['library']['attachPoster']>(async () => undefined),
      onChanged: vi.fn<MudioApi['library']['onChanged']>(listener => subscribe(libraryListeners, listener)),
    },
    libraryFolder: {
      pickAndAdd: vi.fn<MudioApi['libraryFolder']['pickAndAdd']>(async () => undefined),
      remove: vi.fn<MudioApi['libraryFolder']['remove']>(async () => undefined),
      editPlaylists: vi.fn<MudioApi['libraryFolder']['editPlaylists']>(async () => undefined),
      rescan: vi.fn<MudioApi['libraryFolder']['rescan']>(async () => undefined),
    },
    setting: {
      load: vi.fn<MudioApi['setting']['load']>(async () => options.setting ?? buildSetting()),
      save: vi.fn<MudioApi['setting']['save']>(async () => undefined),
      onChanged: vi.fn<MudioApi['setting']['onChanged']>(() => () => undefined),
    },
    launch: {
      takePendingVideoId: vi.fn<MudioApi['launch']['takePendingVideoId']>(async () => options.pendingLaunchVideoId ?? null),
      onOpenVideo: vi.fn<MudioApi['launch']['onOpenVideo']>(() => () => undefined),
    },
    player: {
      open: vi.fn<MudioApi['player']['open']>(async () => undefined),
      takePendingRequest: vi.fn<MudioApi['player']['takePendingRequest']>(async () => options.pendingPlaybackRequest ?? null),
      onPlay: vi.fn<MudioApi['player']['onPlay']>(listener => subscribe(playListeners, listener)),
      returnToLibrary: vi.fn<MudioApi['player']['returnToLibrary']>(),
    },
    defaultPlayer: {
      openSetting: vi.fn<MudioApi['defaultPlayer']['openSetting']>(async () => undefined),
    },
    trayMenu: {
      openLibrary: vi.fn<MudioApi['trayMenu']['openLibrary']>(),
      quit: vi.fn<MudioApi['trayMenu']['quit']>(),
    },
    pathForFile: vi.fn<MudioApi['pathForFile']>(file => `D:\\Drop\\${file.name}`),
    log: vi.fn<MudioApi['log']>(),
  } satisfies MudioApi;

  return {
    api,
    /** Simulates the main process broadcasting a library change to every window. */
    pushLibrary: (nextSnapshot: LibrarySnapshot) => libraryListeners.forEach(listener => listener(nextSnapshot)),
    /** Simulates the library window asking an open player window to play something. */
    pushPlayback: (request: PlaybackRequest) => playListeners.forEach(listener => listener(request)),
  };
}

export type FakeMudio = ReturnType<typeof createFakeApi>;

/**
 * Swaps the preload API for a scripted one.
 * NOTE: src/shared/api/mudio.ts captures `window.mudio` once at import, so the object is mutated in place
 * instead of replaced; dom-setup.ts creates it before any app module loads.
 */
export function installFakeMudio(options: FakeMudioOptions = {}): FakeMudio {
  const fake = createFakeApi(options);
  Object.assign(window.mudio, fake.api);
  return fake;
}
