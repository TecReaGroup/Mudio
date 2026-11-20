import type { BrowserWindow } from 'electron';
import { IPC_CHANNEL } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';
import { createAppWindow, type AppWindowChrome } from './app-window';

const LIBRARY_WINDOW_CHROME: AppWindowChrome = {
  size: { width: 1280, height: 800, minWidth: 900, minHeight: 560 },
  backgroundColor: '#e5e4e0',
  // Must match the h-14 title bar in src/shared/ui/browse-shell.tsx.
  titleBarHeight: 56,
  captionSymbolColor: '#1d1d1d',
  viewHash: '',
};

/**
 * The single library window. While a video plays it waits minimized in the taskbar, so returning to it is one click
 * and closing it there (with the player closed too) quits the app.
 */
export class LibraryWindow {
  private window: BrowserWindow | null = null;
  private pendingVideoId: string | null = null;

  isOpen(): boolean {
    return this.window !== null;
  }

  /** Brings the library to the front, opening it if needed. */
  present(): void {
    if (!this.window) {
      this.window = this.createWindow();
      return;
    }
    if (this.window.isMinimized()) this.window.restore();
    // NOTE: show() as well as focus(): focus() is a no-op on a window that has not appeared yet.
    this.window.show();
    this.window.focus();
  }

  /** Steps aside for the player; a closed library stays closed. */
  minimize(): void {
    this.window?.minimize();
  }

  /** Hands an OS-opened video to the library, which builds its queue and starts the player. */
  openVideo(videoId: string): void {
    if (!this.window) {
      this.window = this.createWindow();
      // The player is about to take the front, so the library never needs to appear.
      this.window.minimize();
    }
    // A renderer still loading cannot receive events yet; it pulls the pending id once mounted.
    if (this.window.webContents.isLoading()) {
      this.pendingVideoId = videoId;
      return;
    }
    this.window.webContents.send(IPC_CHANNEL.launchOpenVideo, videoId);
  }

  takePendingVideoId(): string | null {
    const videoId = this.pendingVideoId;
    this.pendingVideoId = null;
    return videoId;
  }

  private createWindow(): BrowserWindow {
    log('info', 'Window', 'Open library window');
    const window = createAppWindow(LIBRARY_WINDOW_CHROME);
    // Showing a minimized window would restore it in front of the player.
    window.once('ready-to-show', () => {
      if (!window.isMinimized()) window.show();
    });
    window.on('closed', () => {
      this.window = null;
      this.pendingVideoId = null;
    });
    return window;
  }
}
