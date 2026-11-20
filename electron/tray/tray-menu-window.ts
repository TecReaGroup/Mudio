import { BrowserWindow, screen, type Point } from 'electron';
import { TRAY_MENU_VIEW_HASH } from '../../src/shared/contract/mudio-contract';
import { APP_WEB_PREFERENCES, loadAppView } from '../window/app-window';

// Transparent gutter that leaves room for the menu's CSS shadow; must match p-3 in src/feature/tray/tray-menu.tsx.
const SHADOW_GUTTER = 12;
// Must fit src/feature/tray/tray-menu.tsx: two h-8 items, a separator, padding, border and the shadow gutter.
const WINDOW_WIDTH = 188;
const WINDOW_HEIGHT = 107;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Styled replacement for the native tray context menu, which cannot take the app's radii, spacing or fonts.
 * Created once up front and only shown or hidden afterwards, so it pops up without waiting for a renderer to boot.
 */
export class TrayMenuWindow {
  private readonly window = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: APP_WEB_PREFERENCES,
  });

  constructor() {
    loadAppView(this.window, TRAY_MENU_VIEW_HASH);
    // Behaves like a native menu: clicking anywhere else or pressing Escape dismisses it.
    this.window.on('blur', () => this.hide());
    this.window.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') this.hide();
    });
  }

  /** Opens the menu just above the cursor, kept inside the work area so it never lands under the taskbar. */
  popUpAt(cursor: Point): void {
    const { workArea } = screen.getDisplayNearestPoint(cursor);
    // setBounds, not setPosition: moving across monitors with different scaling would otherwise resize the window.
    this.window.setBounds({
      x: clamp(cursor.x - SHADOW_GUTTER, workArea.x, workArea.x + workArea.width - WINDOW_WIDTH),
      y: clamp(cursor.y - WINDOW_HEIGHT + SHADOW_GUTTER, workArea.y, workArea.y + workArea.height - WINDOW_HEIGHT),
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
    });
    this.window.show();
    this.window.focus();
  }

  hide(): void {
    this.window.hide();
  }
}
