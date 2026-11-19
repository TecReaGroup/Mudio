import { app, BrowserWindow } from 'electron';
import { IPC_CHANNEL } from '../src/shared/contract/mudio-contract';
import { ExternalFileOpener, registerLaunchIpc, videoPathsFromArgv } from './launch/external-file-opener';
import { registerLibraryIpc } from './library/library-ipc';
import { VideoLibrary } from './library/video-library';
import { registerLogIpc } from './log/log-ipc';
import { describeError, log } from './log/logger';
import { handleMediaProtocol, registerMediaScheme } from './media/media-protocol';
import { PlayerWindow, registerPlayerIpc } from './player/player-window';
import { registerSettingIpc, SettingStore } from './setting/setting-store';
import { createMainWindow } from './window/main-window';

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload);
}

function startApp(): void {
  const earlyOpenPaths = videoPathsFromArgv(process.argv);
  let mainWindow: BrowserWindow | null = null;
  let opener: ExternalFileOpener | null = null;

  const showMainWindow = () => {
    mainWindow = createMainWindow();
    mainWindow.on('closed', () => { mainWindow = null; });
  };

  const showLibrary = () => {
    if (!mainWindow) return showMainWindow();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  };

  // macOS delivers file-association opens via this event, possibly before "ready".
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (opener) void opener.open([filePath]);
    else earlyOpenPaths.push(filePath);
  });

  app.on('second-instance', (_event, argv) => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
    void opener?.open(videoPathsFromArgv(argv));
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.whenReady()
    .then(async () => {
      log('info', 'App', `Starting Mudio ${app.getVersion()}`);
      const dataDirectory = app.getPath('userData');
      const library = await VideoLibrary.open(dataDirectory, videos => broadcast(IPC_CHANNEL.libraryChanged, videos));
      // Every window holds its own copy of the settings; a stale copy would overwrite newer changes on save.
      const settingStore = await SettingStore.open(dataDirectory, setting => broadcast(IPC_CHANNEL.settingChanged, setting));
      opener = new ExternalFileOpener(library, () => mainWindow);

      handleMediaProtocol(library);
      registerLibraryIpc(library, settingStore);
      registerSettingIpc(settingStore);
      registerLaunchIpc(opener);
      registerPlayerIpc(new PlayerWindow(showLibrary));
      registerLogIpc();

      await opener.open(earlyOpenPaths);
      showMainWindow();
      app.on('activate', () => {
        if (!mainWindow) showMainWindow();
      });
    })
    .catch(error => {
      log('error', 'App', `Startup failed: ${describeError(error)}`);
      app.quit();
    });
}

registerMediaScheme();

if (app.requestSingleInstanceLock()) startApp();
else app.quit();
