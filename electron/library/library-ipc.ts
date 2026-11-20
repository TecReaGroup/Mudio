import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent, type OpenDialogOptions } from 'electron';
import { IPC_CHANNEL, type VideoEdit } from '../../src/shared/contract/mudio-contract';
import { MESSAGES } from '../../src/shared/i18n/message';
import { expectBytes, expectNonNegativeNumber, expectString, expectStringArray, expectText } from '../shared/ipc-payload';
import type { SettingStore } from '../setting/setting-store';
import type { VideoLibrary } from './video-library';

/** Titles come back trimmed, non-blank and unique, so the library can match them as-is. */
function parsePlaylistTitles(value: unknown): string[] {
  const playlistTitles = expectStringArray(value, 'playlistTitles')
    .map(title => title.trim())
    .filter(title => title.length > 0);
  return [...new Set(playlistTitles)];
}

function parseVideoEdit(value: unknown): VideoEdit {
  const candidate = value as Partial<VideoEdit> | null;
  return {
    title: expectText(candidate?.title, 'title'),
    playlistTitles: parsePlaylistTitles(candidate?.playlistTitles),
  };
}

function showOpenDialogFor(event: IpcMainInvokeEvent, options: OpenDialogOptions) {
  const owner = BrowserWindow.fromWebContents(event.sender);
  return owner ? dialog.showOpenDialog(owner, options) : dialog.showOpenDialog(options);
}

export function registerLibraryIpc(library: VideoLibrary, settingStore: SettingStore): void {
  const dialogMessage = () => MESSAGES[settingStore.current().language].dialog;

  ipcMain.handle(IPC_CHANNEL.libraryList, () => library.snapshot());

  ipcMain.handle(IPC_CHANNEL.libraryFolderPickAndAdd, async event => {
    const selection = await showOpenDialogFor(event, { title: dialogMessage().addLibraryFolder, properties: ['openDirectory'] });
    if (!selection.canceled) await library.addFolder(selection.filePaths[0]);
  });

  ipcMain.handle(IPC_CHANNEL.libraryFolderRemove, (_event, folderPath: unknown) =>
    library.removeFolder(expectString(folderPath, 'folderPath')));

  ipcMain.handle(IPC_CHANNEL.libraryFolderEditPlaylists, (_event, folderPath: unknown, playlistTitles: unknown) =>
    library.editFolderPlaylists(expectString(folderPath, 'folderPath'), parsePlaylistTitles(playlistTitles)));

  ipcMain.handle(IPC_CHANNEL.libraryFolderRescan, () => library.rescanFolders());

  ipcMain.handle(IPC_CHANNEL.libraryImportPaths, (_event, paths: unknown) =>
    library.importPaths(expectStringArray(paths, 'paths')));

  ipcMain.handle(IPC_CHANNEL.libraryRemove, (_event, videoId: unknown) =>
    library.remove(expectString(videoId, 'videoId')));

  ipcMain.handle(IPC_CHANNEL.libraryArrange, (_event, videoIds: unknown) =>
    library.arrange(expectStringArray(videoIds, 'videoIds')));

  ipcMain.handle(IPC_CHANNEL.libraryArrangeRecent, (_event, videoIds: unknown) =>
    library.arrangeRecent(expectStringArray(videoIds, 'videoIds')));

  ipcMain.handle(IPC_CHANNEL.libraryArrangePlaylist, (_event, playlistId: unknown, videoIds: unknown) =>
    library.arrangePlaylist(expectString(playlistId, 'playlistId'), expectStringArray(videoIds, 'videoIds')));

  ipcMain.handle(IPC_CHANNEL.libraryEditVideo, (_event, videoId: unknown, edit: unknown) =>
    library.editVideo(expectString(videoId, 'videoId'), parseVideoEdit(edit)));

  ipcMain.handle(IPC_CHANNEL.libraryRemoveFromRecent, (_event, videoId: unknown) =>
    library.removeFromRecent(expectString(videoId, 'videoId')));

  ipcMain.handle(IPC_CHANNEL.libraryRecordPlayback, (_event, videoId: unknown, positionSec: unknown) =>
    library.recordPlayback(expectString(videoId, 'videoId'), expectNonNegativeNumber(positionSec, 'positionSec')));

  ipcMain.handle(IPC_CHANNEL.libraryAttachPoster, (_event, videoId: unknown, jpegBytes: unknown, durationSec: unknown) =>
    library.attachPoster(
      expectString(videoId, 'videoId'),
      expectBytes(jpegBytes, 'jpegBytes'),
      durationSec === null ? null : expectNonNegativeNumber(durationSec, 'durationSec'),
    ));
}
