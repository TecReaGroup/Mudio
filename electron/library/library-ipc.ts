import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import { IPC_CHANNEL, SUPPORTED_VIDEO_EXTENSIONS } from '../../src/shared/contract/mudio-contract';
import { expectBytes, expectNonNegativeNumber, expectString, expectStringArray } from '../shared/ipc-payload';
import type { VideoLibrary } from './video-library';

const VIDEO_FILE_FILTER = { name: '视频', extensions: [...SUPPORTED_VIDEO_EXTENSIONS] };

function showOpenDialogFor(event: IpcMainInvokeEvent, options: OpenDialogOptions) {
  const owner = BrowserWindow.fromWebContents(event.sender);
  return owner ? dialog.showOpenDialog(owner, options) : dialog.showOpenDialog(options);
}

export function registerLibraryIpc(library: VideoLibrary): void {
  ipcMain.handle(IPC_CHANNEL.libraryList, () => library.list());

  ipcMain.handle(IPC_CHANNEL.libraryPickFiles, async event => {
    const selection = await showOpenDialogFor(event, {
      title: '打开视频',
      properties: ['openFile', 'multiSelections'],
      filters: [VIDEO_FILE_FILTER],
    });
    return selection.canceled ? [] : library.importPaths(selection.filePaths);
  });

  ipcMain.handle(IPC_CHANNEL.libraryPickFolder, async event => {
    const selection = await showOpenDialogFor(event, { title: '导入文件夹', properties: ['openDirectory'] });
    return selection.canceled ? [] : library.importPaths(selection.filePaths);
  });

  ipcMain.handle(IPC_CHANNEL.libraryImportPaths, (_event, paths: unknown) =>
    library.importPaths(expectStringArray(paths, 'paths')));

  ipcMain.handle(IPC_CHANNEL.libraryRemove, (_event, videoId: unknown) =>
    library.remove(expectString(videoId, 'videoId')));

  ipcMain.handle(IPC_CHANNEL.libraryRecordPlayback, (_event, videoId: unknown, positionSec: unknown) =>
    library.recordPlayback(expectString(videoId, 'videoId'), expectNonNegativeNumber(positionSec, 'positionSec')));

  ipcMain.handle(IPC_CHANNEL.libraryAttachPoster, (_event, videoId: unknown, jpegBytes: unknown, durationSec: unknown) =>
    library.attachPoster(
      expectString(videoId, 'videoId'),
      expectBytes(jpegBytes, 'jpegBytes'),
      durationSec === null ? null : expectNonNegativeNumber(durationSec, 'durationSec'),
    ));
}
