import { ipcMain, type BrowserWindow } from 'electron';
import { IPC_CHANNEL } from '../../src/shared/contract/mudio-contract';
import { isSupportedVideoPath, type VideoLibrary } from '../library/video-library';
import { log } from '../log/logger';

export function videoPathsFromArgv(argv: string[]): string[] {
  return argv.slice(1).filter(argument => !argument.startsWith('-') && isSupportedVideoPath(argument));
}

/** Handles files the OS asks us to open (file association, second instance, macOS open-file). */
export class ExternalFileOpener {
  private pendingVideoId: string | null = null;

  constructor(
    private readonly library: VideoLibrary,
    private readonly getWindow: () => BrowserWindow | null,
  ) {}

  async open(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return;
    const [firstVideo] = await this.library.importPaths(filePaths);
    if (!firstVideo) return;
    log('info', 'Launch', `Open requested for video ${firstVideo.id}`);

    const window = this.getWindow();
    // A renderer still loading cannot receive events yet; it pulls the pending id once mounted.
    if (!window || window.webContents.isLoading()) {
      this.pendingVideoId = firstVideo.id;
      return;
    }
    window.webContents.send(IPC_CHANNEL.launchOpenVideo, firstVideo.id);
    if (window.isMinimized()) window.restore();
    window.focus();
  }

  takePendingVideoId(): string | null {
    const videoId = this.pendingVideoId;
    this.pendingVideoId = null;
    return videoId;
  }
}

export function registerLaunchIpc(opener: ExternalFileOpener): void {
  ipcMain.handle(IPC_CHANNEL.launchTakePending, () => opener.takePendingVideoId());
}
