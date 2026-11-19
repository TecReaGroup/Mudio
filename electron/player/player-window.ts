import { ipcMain, type BrowserWindow } from 'electron';
import { IPC_CHANNEL, PLAYER_VIEW_HASH, type PlaybackRequest } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';
import { expectString, expectStringArray } from '../shared/ipc-payload';
import { createAppWindow, type AppWindowChrome } from '../window/app-window';

const PLAYER_WINDOW_CHROME: AppWindowChrome = {
  size: { width: 1280, height: 760, minWidth: 720, minHeight: 420 },
  backgroundColor: '#101010',
  // Must match the h-12 title bar in src/shared/ui/window-title-bar.tsx.
  titleBarHeight: 48,
  captionSymbolColor: '#fffdf9',
  viewHash: PLAYER_VIEW_HASH,
};

/** The single player window: opening a video reuses it when it already exists. */
export class PlayerWindow {
  private window: BrowserWindow | null = null;
  private pendingRequest: PlaybackRequest | null = null;

  constructor(private readonly showLibrary: () => void) {}

  open(request: PlaybackRequest): void {
    log('info', 'Player', `Open video ${request.videoId} in a playlist of ${request.playlistIds.length}`);
    const window = this.window ?? this.createWindow();

    // A renderer still loading cannot receive events yet; it pulls the pending request once mounted.
    if (window.webContents.isLoading()) {
      this.pendingRequest = request;
    } else {
      window.webContents.send(IPC_CHANNEL.playerPlay, request);
    }
    if (window.isMinimized()) window.restore();
    window.focus();
  }

  returnToLibrary(): void {
    log('info', 'Player', 'Return to library');
    // Show the library first so closing the last window never triggers window-all-closed and quits the app.
    this.showLibrary();
    this.window?.close();
  }

  takePendingRequest(): PlaybackRequest | null {
    const request = this.pendingRequest;
    this.pendingRequest = null;
    return request;
  }

  private createWindow(): BrowserWindow {
    const window = createAppWindow(PLAYER_WINDOW_CHROME);
    window.on('closed', () => {
      this.window = null;
      this.pendingRequest = null;
    });
    this.window = window;
    return window;
  }
}

function parsePlaybackRequest(value: unknown): PlaybackRequest {
  const candidate = value as Partial<PlaybackRequest> | null;
  return {
    videoId: expectString(candidate?.videoId, 'videoId'),
    playlistIds: expectStringArray(candidate?.playlistIds, 'playlistIds'),
    playlistTitle: expectString(candidate?.playlistTitle, 'playlistTitle'),
    playlistId: candidate?.playlistId === null ? null : expectString(candidate?.playlistId, 'playlistId'),
  };
}

export function registerPlayerIpc(playerWindow: PlayerWindow): void {
  // invoke, not send: a malformed payload then rejects in the renderer instead of throwing in main.
  ipcMain.handle(IPC_CHANNEL.playerOpen, (_event, request: unknown) => playerWindow.open(parsePlaybackRequest(request)));
  ipcMain.handle(IPC_CHANNEL.playerTakePending, () => playerWindow.takePendingRequest());
  ipcMain.on(IPC_CHANNEL.playerReturnToLibrary, () => playerWindow.returnToLibrary());
}
