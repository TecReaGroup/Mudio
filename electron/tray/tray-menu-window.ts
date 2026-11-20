import { BrowserWindow, screen, type Point, type Rectangle } from 'electron';
import { TRAY_MENU_VIEW_HASH } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';
import { APP_WEB_PREFERENCES, loadAppView } from '../window/app-window';

// Must fit src/feature/tray/tray-menu.tsx: two h-8 items, a separator, padding, border and the p-3 shadow gutter.
// The gutter also keeps the visible card clear of the taskbar edge the window is placed against.
const WINDOW_WIDTH = 188;
const WINDOW_HEIGHT = 107;

type ScreenEdge = 'top' | 'bottom' | 'left' | 'right';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The taskbar holding the tray icon lies along the display edge nearest to it. */
function nearestEdge(area: Rectangle, point: Point): ScreenEdge {
  const distances: [ScreenEdge, number][] = [
    ['top', point.y - area.y],
    ['bottom', area.y + area.height - point.y],
    ['left', point.x - area.x],
    ['right', area.x + area.width - point.x],
  ];
  return distances.reduce((nearest, candidate) => (candidate[1] < nearest[1] ? candidate : nearest))[0];
}

/** Puts the window right next to the tray icon on the side facing away from the taskbar, so the two never overlap. */
function menuBoundsBeside(trayBounds: Rectangle): Rectangle {
  const { bounds: area } = screen.getDisplayMatching(trayBounds);
  const center = { x: trayBounds.x + trayBounds.width / 2, y: trayBounds.y + trayBounds.height / 2 };
  const centeredX = clamp(center.x - WINDOW_WIDTH / 2, area.x, area.x + area.width - WINDOW_WIDTH);
  const centeredY = clamp(center.y - WINDOW_HEIGHT / 2, area.y, area.y + area.height - WINDOW_HEIGHT);
  const origin: Record<ScreenEdge, Point> = {
    bottom: { x: centeredX, y: trayBounds.y - WINDOW_HEIGHT },
    top: { x: centeredX, y: trayBounds.y + trayBounds.height },
    left: { x: trayBounds.x + trayBounds.width, y: centeredY },
    right: { x: trayBounds.x - WINDOW_WIDTH, y: centeredY },
  };
  const { x, y } = origin[nearestEdge(area, center)];
  return { x: Math.round(x), y: Math.round(y), width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
}

/**
 * Styled replacement for the native tray context menu, which cannot take the app's radii, spacing or fonts.
 *
 * NOTE: The window is shown once at startup and never hidden; closing only makes it fully transparent and click-through.
 * Every real show() made Windows rebuild the window's surface, play its open animation and present a blank frame
 * first, which flashed on each right-click. Opacity changes skip all of that, and the page keeps painting while unseen.
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
    webPreferences: APP_WEB_PREFERENCES,
  });
  private isOpen = false;

  constructor() {
    loadAppView(this.window, TRAY_MENU_VIEW_HASH);
    // NOTE: Not the constructor's alwaysOnTop: its default 'floating' level, like the other macOS levels that sit below
    // the Dock, makes Electron on Windows tuck the window behind the taskbar on show/focus, so the menu ended up
    // above or below it depending on timing. 'pop-up-menu' stays above the taskbar and its tray overflow flyout.
    this.window.setAlwaysOnTop(true, 'pop-up-menu');
    this.conceal();
    this.window.once('ready-to-show', () => this.window.showInactive());
    // Behaves like a native menu: clicking anywhere else or pressing Escape dismisses it.
    this.window.on('focus', () => log('debug', 'Tray', 'Menu focused'));
    this.window.on('blur', () => {
      log('debug', 'Tray', 'Menu lost focus');
      this.close();
    });
    this.window.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') this.close();
    });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.conceal();
    // An unseen window must not keep the keyboard focus it had while open.
    if (this.window.isFocused()) this.window.blur();
  }

  openBeside(trayBounds: Rectangle): void {
    const menuBounds = menuBoundsBeside(trayBounds);
    // HACK: With monitors at different scaling, Electron converts DIP bounds using the scale of the monitor the window
    // is leaving, so the first call lands it off target. Once it sits on the target monitor, the second call is exact.
    this.window.setBounds(menuBounds);
    this.window.setBounds(menuBounds);
    this.isOpen = true;
    this.window.setIgnoreMouseEvents(false);
    this.window.setOpacity(1);
    // focus() alone may leave a window shown inactive at startup unactivated; without focus, blur never fires and
    // clicking elsewhere would not dismiss the menu. show() on an already shown window only activates it.
    this.window.show();
    this.window.focus();
    log('debug', 'Tray', `Menu at ${JSON.stringify(this.window.getBounds())}, tray icon at ${JSON.stringify(trayBounds)}`);
  }

  private conceal(): void {
    this.window.setOpacity(0);
    this.window.setIgnoreMouseEvents(true);
    // The item clicked last would otherwise still show its hover highlight when the menu next appears.
    this.window.webContents.sendInputEvent({ type: 'mouseLeave', x: -1, y: -1 });
  }
}
