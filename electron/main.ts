// NOTE: Must stay the first import: the logger resolves userData when its module loads.
import './portable/portable-data-path';
import { app, BrowserWindow, type Tray } from 'electron';
import { IPC_CHANNEL } from '../src/shared/contract/mudio-contract';
import { registerDefaultPlayerIpc } from './launch/default-player';
import { ExternalFileOpener, registerLaunchIpc, videoPathsFromArgv } from './launch/external-file-opener';
import { registerLibraryIpc } from './library/library-ipc';
import { VideoLibrary } from './library/video-library';
import { registerLogIpc } from './log/log-ipc';
import { describeError, log } from './log/logger';
import { handleMediaProtocol, registerMediaScheme } from './media/media-protocol';
import { PlayerWindow, registerPlayerIpc } from './player/player-window';
import { registerSettingIpc, SettingStore } from './setting/setting-store';
import { createAppTray } from './tray/app-tray';
import { LibraryWindow } from './window/library-window';

// Must equal build.appId in package.json: the installer stamps it on the shortcuts, and a mismatch makes Windows
// show the pinned shortcut and the running app as two separate taskbar icons.
const APP_USER_MODEL_ID = 'com.mudio.app';

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload);
}

function startApp(): void {
  const earlyOpenPaths = videoPathsFromArgv(process.argv);
  const libraryWindow = new LibraryWindow();
  let opener: ExternalFileOpener | null = null;
  // Held for the app's lifetime: a collected Tray disappears from the notification area.
  let tray: Tray | null = null;

  // macOS delivers file-association opens via this event, possibly before "ready".
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (opener) void opener.open([filePath]);
    else earlyOpenPaths.push(filePath);
  });

  // Launching Mudio again opens the file it was given, or brings back the library from wherever it waits.
  app.on('second-instance', (_event, argv) => {
    if (!opener) return;
    const videoPaths = videoPathsFromArgv(argv);
    if (videoPaths.length > 0) void opener.open(videoPaths);
    else libraryWindow.present();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.whenReady()
    .then(async () => {
      log('info', 'App', `Starting Mudio ${app.getVersion()}`);
      const dataDirectory = app.getPath('userData');
      const [library, settingStore] = await Promise.all([
        VideoLibrary.open(dataDirectory, snapshot => broadcast(IPC_CHANNEL.libraryChanged, snapshot)),
        // Every window holds its own copy of the settings; a stale copy would overwrite newer changes on save.
        SettingStore.open(dataDirectory, setting => broadcast(IPC_CHANNEL.settingChanged, setting)),
      ]);
      const playerWindow = new PlayerWindow(libraryWindow);
      opener = new ExternalFileOpener(library, libraryWindow, playerWindow);
      tray = createAppTray(libraryWindow);

      handleMediaProtocol(library);
      registerLibraryIpc(library, settingStore);
      registerSettingIpc(settingStore);
      registerLaunchIpc(libraryWindow);
      registerDefaultPlayerIpc();
      registerPlayerIpc(playerWindow);
      registerLogIpc();

      await opener.open(earlyOpenPaths);
      // A video opened at launch has already started the library, hidden behind the player.
      if (!libraryWindow.isOpen()) libraryWindow.present();
      // In the background: new videos stream into the open window instead of delaying it.
      library.rescanFolders()
        .catch(error => log('error', 'Library', `Startup folder rescan failed: ${describeError(error)}`));
      library.dropMissingRecent()
        .catch(error => log('error', 'Library', `Startup Recent check failed: ${describeError(error)}`));
      app.on('activate', () => {
        if (!BrowserWindow.getAllWindows().some(window => window.isVisible())) libraryWindow.present();
      });
    })
    .catch(error => {
      log('error', 'App', `Startup failed: ${describeError(error)}`);
      app.quit();
    });
}

registerMediaScheme();
if (process.platform === 'win32') app.setAppUserModelId(APP_USER_MODEL_ID);

if (app.requestSingleInstanceLock()) startApp();
else app.quit();
