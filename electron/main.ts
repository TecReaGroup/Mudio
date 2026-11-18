import { app, BrowserWindow } from 'electron';
import { IPC_CHANNEL, type VideoEntry } from '../src/shared/contract/mudio-contract';
import { ExternalFileOpener, registerLaunchIpc, videoPathsFromArgv } from './launch/external-file-opener';
import { registerLibraryIpc } from './library/library-ipc';
import { VideoLibrary } from './library/video-library';
import { registerLogIpc } from './log/log-ipc';
import { describeError, log } from './log/logger';
import { handleMediaProtocol, registerMediaScheme } from './media/media-protocol';
import { registerSettingIpc, SettingStore } from './setting/setting-store';
import { createMainWindow } from './window/main-window';

function broadcastLibrary(videos: VideoEntry[]): void {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(IPC_CHANNEL.libraryChanged, videos);
}

function startApp(): void {
  const earlyOpenPaths = videoPathsFromArgv(process.argv);
  let mainWindow: BrowserWindow | null = null;
  let opener: ExternalFileOpener | null = null;

  const showMainWindow = () => {
    mainWindow = createMainWindow();
    mainWindow.on('closed', () => { mainWindow = null; });
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
      const library = await VideoLibrary.open(dataDirectory, broadcastLibrary);
      const settingStore = await SettingStore.open(dataDirectory);
      opener = new ExternalFileOpener(library, () => mainWindow);

      handleMediaProtocol(library);
      registerLibraryIpc(library, settingStore);
      registerSettingIpc(settingStore);
      registerLaunchIpc(opener);
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
