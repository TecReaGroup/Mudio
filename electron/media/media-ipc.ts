import { ipcMain } from 'electron';
import { IPC_CHANNEL } from '../../src/shared/contract/mudio-contract';
import type { VideoLibrary } from '../library/video-library';
import { expectString } from '../shared/ipc-payload';
import { readKeyframeTimes } from './keyframe-index';

export function registerMediaIpc(library: VideoLibrary): void {
  ipcMain.handle(IPC_CHANNEL.mediaKeyframeTimes, async (_event, videoId: unknown) => {
    const video = library.find(expectString(videoId, 'videoId'));
    return video ? readKeyframeTimes(video.filePath) : [];
  });
}
