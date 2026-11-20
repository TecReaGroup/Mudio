import { screen, type Rectangle } from 'electron';
import { TRAY_MENU_VIEW_HASH } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';
import { createRendererWindow } from '../window/app-window';
import { placeTrayMenu, TRAY_MENU_SIZE } from './tray-menu-placement';

/**
 * Styled replacement for the native tray context menu, which cannot take the app's radii, spacing or fonts.
 *
 * NOTE: The window is shown once at startup and never hidden; closing only makes it fully transparent and click-through.
 * Every real show() made Windows rebuild the window's surface, play its open animation and present a blank frame
 * first, which flashed on each right-click. Opacity changes skip all of that, and the page keeps painting while unseen.
 */
export class TrayMenuWindow {
  private readonly window = createRendererWindow({
    ...TRAY_MENU_SIZE,
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
  }, TRAY_MENU_VIEW_HASH);
  private isOpen = false;

  constructor() {
    // NOTE: Not the constructor's alwaysOnTop: its default 'floating' level, like the other macOS levels that sit below
    // the Dock, makes Electron on Windows tuck the window behind the taskbar on show/focus, so the menu ended up
    // above or below it depending on timing. 'pop-up-menu' stays above the taskbar and its tray overflow flyout.
    this.window.setAlwaysOnTop(true, 'pop-up-menu');
    this.conceal();
    this.window.once('ready-to-show', () => this.window.showInactive());
    // Behaves like a native menu: clicking anywhere else or pressing Escape dismisses it.
    this.window.on('blur', () => this.close());
    this.window.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') this.close();
    });
  }

  openBeside(trayBounds: Rectangle): void {
    const menuBounds = placeTrayMenu(trayBounds, screen.getDisplayMatching(trayBounds).bounds);
    this.window.setBounds(menuBounds);
    this.isOpen = true;
    this.window.setIgnoreMouseEvents(false);
    this.window.setOpacity(1);
    // focus() alone may leave a window shown inactive at startup unactivated; without focus, blur never fires and
    // clicking elsewhere would not dismiss the menu. show() on an already shown window only activates it.
    this.window.show();
    this.window.focus();
    // Actual bounds, not the requested ones: a mismatch here means Windows display scaling moved the window.
    log('debug', 'Tray', `Menu at ${JSON.stringify(this.window.getBounds())}, tray icon at ${JSON.stringify(trayBounds)}`);
  }

  close(): void {
    // blur() below fires 'blur' again, which lands here with the menu already closed.
    if (!this.isOpen) return;
    this.isOpen = false;
    this.conceal();
    // An unseen window must not keep the keyboard focus it had while open.
    if (this.window.isFocused()) this.window.blur();
  }

  private conceal(): void {
    this.window.setOpacity(0);
    this.window.setIgnoreMouseEvents(true);
    // The item clicked last would otherwise still show its hover highlight when the menu next appears.
    this.window.webContents.sendInputEvent({ type: 'mouseLeave', x: -1, y: -1 });
  }
}
