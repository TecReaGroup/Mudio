import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';
import { IPC_CHANNEL, type MudioApi, type Unsubscribe } from '../src/shared/contract/mudio-contract';

function subscribe<Payload>(channel: string, listener: (payload: Payload) => void): Unsubscribe {
  const forward = (_event: IpcRendererEvent, payload: Payload) => listener(payload);
  ipcRenderer.on(channel, forward);
  return () => ipcRenderer.off(channel, forward);
}

const mudioApi: MudioApi = {
  platform: process.platform,
  library: {
    list: () => ipcRenderer.invoke(IPC_CHANNEL.libraryList),
    importPaths: paths => ipcRenderer.invoke(IPC_CHANNEL.libraryImportPaths, paths),
    remove: videoId => ipcRenderer.invoke(IPC_CHANNEL.libraryRemove, videoId),
    arrange: videoIds => ipcRenderer.invoke(IPC_CHANNEL.libraryArrange, videoIds),
    arrangeRecent: videoIds => ipcRenderer.invoke(IPC_CHANNEL.libraryArrangeRecent, videoIds),
    arrangePlaylist: (playlistId, videoIds) => ipcRenderer.invoke(IPC_CHANNEL.libraryArrangePlaylist, playlistId, videoIds),
    editVideo: (videoId, edit) => ipcRenderer.invoke(IPC_CHANNEL.libraryEditVideo, videoId, edit),
    removeFromRecent: videoId => ipcRenderer.invoke(IPC_CHANNEL.libraryRemoveFromRecent, videoId),
    recordPlayback: (videoId, positionSec) => ipcRenderer.invoke(IPC_CHANNEL.libraryRecordPlayback, videoId, positionSec),
    attachPoster: (videoId, jpegBytes, durationSec) =>
      ipcRenderer.invoke(IPC_CHANNEL.libraryAttachPoster, videoId, jpegBytes, durationSec),
    onChanged: listener => subscribe(IPC_CHANNEL.libraryChanged, listener),
  },
  libraryFolder: {
    pickAndAdd: () => ipcRenderer.invoke(IPC_CHANNEL.libraryFolderPickAndAdd),
    remove: folderPath => ipcRenderer.invoke(IPC_CHANNEL.libraryFolderRemove, folderPath),
    editPlaylists: (folderPath, playlistTitles) =>
      ipcRenderer.invoke(IPC_CHANNEL.libraryFolderEditPlaylists, folderPath, playlistTitles),
    rescan: () => ipcRenderer.invoke(IPC_CHANNEL.libraryFolderRescan),
  },
  media: {
    keyframeTimes: videoId => ipcRenderer.invoke(IPC_CHANNEL.mediaKeyframeTimes, videoId),
  },
  setting: {
    load: () => ipcRenderer.invoke(IPC_CHANNEL.settingLoad),
    save: setting => ipcRenderer.invoke(IPC_CHANNEL.settingSave, setting),
    onChanged: listener => subscribe(IPC_CHANNEL.settingChanged, listener),
  },
  launch: {
    takePendingVideoId: () => ipcRenderer.invoke(IPC_CHANNEL.launchTakePending),
    onOpenVideo: listener => subscribe(IPC_CHANNEL.launchOpenVideo, listener),
  },
  player: {
    open: request => ipcRenderer.invoke(IPC_CHANNEL.playerOpen, request),
    takePendingRequest: () => ipcRenderer.invoke(IPC_CHANNEL.playerTakePending),
    onPlay: listener => subscribe(IPC_CHANNEL.playerPlay, listener),
    returnToLibrary: () => ipcRenderer.send(IPC_CHANNEL.playerReturnToLibrary),
  },
  defaultPlayer: {
    openSetting: () => ipcRenderer.invoke(IPC_CHANNEL.defaultPlayerOpenSetting),
  },
  trayMenu: {
    openLibrary: () => ipcRenderer.send(IPC_CHANNEL.trayMenuOpenLibrary),
    quit: () => ipcRenderer.send(IPC_CHANNEL.trayMenuQuit),
  },
  pathForFile: file => webUtils.getPathForFile(file),
  log: (level, module, message) => ipcRenderer.send(IPC_CHANNEL.log, level, module, message),
};

contextBridge.exposeInMainWorld('mudio', mudioApi);
