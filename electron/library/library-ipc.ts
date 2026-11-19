import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import { IPC_CHANNEL, SUPPORTED_VIDEO_EXTENSIONS } from '../../src/shared/contract/mudio-contract';
import { MESSAGES } from '../../src/shared/i18n/message';
import { expectBytes, expectNonNegativeNumber, expectString, expectStringArray } from '../shared/ipc-payload';
import type { SettingStore } from '../setting/setting-store';
import type { VideoLibrary } from './video-library';

function showOpenDialogFor(event: IpcMainInvokeEvent, options: OpenDialogOptions) {
  const owner = BrowserWindow.fromWebContents(event.sender);
  return owner ? dialog.showOpenDialog(owner, options) : dialog.showOpenDialog(options);
}

export function registerLibraryIpc(library: VideoLibrary, settingStore: SettingStore): void {
  const dialogMessage = () => MESSAGES[settingStore.current().language].dialog;

  ipcMain.handle(IPC_CHANNEL.libraryList, () => library.snapshot());

  ipcMain.handle(IPC_CHANNEL.libraryPickFiles, async event => {
    const message = dialogMessage();
    const selection = await showOpenDialogFor(event, {
      title: message.openVideo,
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: message.videoFilter, extensions: [...SUPPORTED_VIDEO_EXTENSIONS] }],
    });
    return selection.canceled ? [] : library.importPaths(selection.filePaths);
  });

  ipcMain.handle(IPC_CHANNEL.libraryPickFolder, async event => {
    const selection = await showOpenDialogFor(event, { title: dialogMessage().importFolder, properties: ['openDirectory'] });
    return selection.canceled ? [] : library.importPaths(selection.filePaths);
  });

  ipcMain.handle(IPC_CHANNEL.libraryFolderList, () => library.listFolders());

  ipcMain.handle(IPC_CHANNEL.libraryFolderPickAndAdd, async event => {
    const selection = await showOpenDialogFor(event, { title: dialogMessage().addLibraryFolder, properties: ['openDirectory'] });
    return selection.canceled ? library.listFolders() : library.addFolder(selection.filePaths[0]);
  });

  ipcMain.handle(IPC_CHANNEL.libraryFolderRemove, (_event, folderPath: unknown) =>
    library.removeFolder(expectString(folderPath, 'folderPath')));

  ipcMain.handle(IPC_CHANNEL.libraryFolderRescan, () => library.rescanFolders());

  ipcMain.handle(IPC_CHANNEL.libraryImportPaths, (_event, paths: unknown) =>
    library.importPaths(expectStringArray(paths, 'paths')));

  ipcMain.handle(IPC_CHANNEL.libraryRemove, (_event, videoId: unknown) =>
    library.remove(expectString(videoId, 'videoId')));

  ipcMain.handle(IPC_CHANNEL.libraryArrange, (_event, videoIds: unknown) =>
    library.arrange(expectStringArray(videoIds, 'videoIds')));

  ipcMain.handle(IPC_CHANNEL.libraryArrangeRecent, (_event, videoIds: unknown) =>
    library.arrangeRecent(expectStringArray(videoIds, 'videoIds')));

  ipcMain.handle(IPC_CHANNEL.libraryRecordPlayback, (_event, videoId: unknown, positionSec: unknown) =>
    library.recordPlayback(expectString(videoId, 'videoId'), expectNonNegativeNumber(positionSec, 'positionSec')));

  ipcMain.handle(IPC_CHANNEL.libraryAttachPoster, (_event, videoId: unknown, jpegBytes: unknown, durationSec: unknown) =>
    library.attachPoster(
      expectString(videoId, 'videoId'),
      expectBytes(jpegBytes, 'jpegBytes'),
      durationSec === null ? null : expectNonNegativeNumber(durationSec, 'durationSec'),
    ));
}
