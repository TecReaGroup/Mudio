import { app, BrowserWindow } from 'electron';
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
      const library = await VideoLibrary.open(dataDirectory, snapshot => broadcast(IPC_CHANNEL.libraryChanged, snapshot));
      // Every window holds its own copy of the settings; a stale copy would overwrite newer changes on save.
      const settingStore = await SettingStore.open(dataDirectory, setting => broadcast(IPC_CHANNEL.settingChanged, setting));
      opener = new ExternalFileOpener(library, libraryWindow);

      handleMediaProtocol(library);
      registerLibraryIpc(library, settingStore);
      registerSettingIpc(settingStore);
      registerLaunchIpc(libraryWindow);
      registerDefaultPlayerIpc();
      registerPlayerIpc(new PlayerWindow(libraryWindow));
      registerLogIpc();

      await opener.open(earlyOpenPaths);
      // A video opened at launch has already started the library, minimized behind the player.
      if (!libraryWindow.isOpen()) libraryWindow.present();
      // In the background: new videos stream into the open window instead of delaying it.
      library.rescanFolders()
        .catch(error => log('error', 'Library', `Startup folder rescan failed: ${describeError(error)}`));
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) libraryWindow.present();
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
