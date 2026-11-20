import { app, type BrowserWindow } from 'electron';
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
 * The single library window. Closing it, or playing a video, hides it while the app waits in the tray; the player's back
 * button, the tray icon or launching Mudio again brings it back. Only quitting from the tray really closes it.
 */
export class LibraryWindow {
  private window: BrowserWindow | null = null;
  private pendingVideoId: string | null = null;
  // Also stops a library created for a launch video from appearing on its first paint.
  private isWaitingInTray = false;
  private isAppQuitting = false;

  constructor() {
    app.on('before-quit', () => { this.isAppQuitting = true; });
  }

  /** Brings the library to the front, opening it if needed. */
  present(): void {
    this.isWaitingInTray = false;
    if (!this.window) {
      this.window = this.createWindow();
      return;
    }
    if (this.window.isMinimized()) this.window.restore();
    this.window.show();
    this.window.focus();
  }

  /** Steps aside for the player; a closed library stays closed. */
  hide(): void {
    this.isWaitingInTray = true;
    this.window?.hide();
  }

  isOpen(): boolean {
    return this.window !== null;
  }

  /** Hands an OS-opened video to the library, which builds its queue and starts the player. */
  openVideo(videoId: string): void {
    if (!this.window) {
      // The player is about to take the front, so the library never needs to appear.
      this.isWaitingInTray = true;
      this.window = this.createWindow();
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
    window.once('ready-to-show', () => {
      if (!this.isWaitingInTray) window.show();
    });
    window.on('close', event => {
      if (this.isAppQuitting) return;
      event.preventDefault();
      this.hide();
    });
    // Windows logoff or shutdown skips before-quit; a vetoed close here would hold the session open.
    window.on('session-end', () => { this.isAppQuitting = true; });
    window.on('closed', () => {
      this.window = null;
      this.pendingVideoId = null;
    });
    return window;
  }
}
