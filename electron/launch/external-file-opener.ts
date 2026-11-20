import { ipcMain } from 'electron';
import { IPC_CHANNEL } from '../../src/shared/contract/mudio-contract';
import { isSupportedVideoPath, type VideoLibrary } from '../library/video-library';
import { log } from '../log/logger';
import type { LibraryWindow } from '../window/library-window';

export function videoPathsFromArgv(argv: string[]): string[] {
  return argv.slice(1).filter(argument => !argument.startsWith('-') && isSupportedVideoPath(argument));
}

/** Handles files the OS asks us to open (file association, second instance, macOS open-file). */
export class ExternalFileOpener {
  constructor(
    private readonly library: VideoLibrary,
    private readonly libraryWindow: LibraryWindow,
  ) {}

  async open(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return;
    const [firstVideo] = await this.library.importPaths(filePaths);
    if (!firstVideo) return;
    log('info', 'Launch', `Open requested for video ${firstVideo.id}`);
    this.libraryWindow.openVideo(firstVideo.id);
  }
}

export function registerLaunchIpc(libraryWindow: LibraryWindow): void {
  ipcMain.handle(IPC_CHANNEL.launchTakePending, () => libraryWindow.takePendingVideoId());
}
