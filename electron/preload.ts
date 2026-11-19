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
    pickAndImportFiles: () => ipcRenderer.invoke(IPC_CHANNEL.libraryPickFiles),
    pickAndImportFolder: () => ipcRenderer.invoke(IPC_CHANNEL.libraryPickFolder),
    importPaths: paths => ipcRenderer.invoke(IPC_CHANNEL.libraryImportPaths, paths),
    remove: videoId => ipcRenderer.invoke(IPC_CHANNEL.libraryRemove, videoId),
    recordPlayback: (videoId, positionSec) => ipcRenderer.invoke(IPC_CHANNEL.libraryRecordPlayback, videoId, positionSec),
    attachPoster: (videoId, jpegBytes, durationSec) =>
      ipcRenderer.invoke(IPC_CHANNEL.libraryAttachPoster, videoId, jpegBytes, durationSec),
    onChanged: listener => subscribe(IPC_CHANNEL.libraryChanged, listener),
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
  pathForFile: file => webUtils.getPathForFile(file),
  log: (level, module, message) => ipcRenderer.send(IPC_CHANNEL.log, level, module, message),
};

contextBridge.exposeInMainWorld('mudio', mudioApi);
