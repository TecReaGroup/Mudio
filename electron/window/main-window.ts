import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, ipcMain } from 'electron';
import { COLOR_SCHEMES, IPC_CHANNEL, type ColorScheme } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';

const WINDOW_SIZE = { width: 1280, height: 800, minWidth: 900, minHeight: 560 };
// Must match the h-13 title bars (browse-shell.tsx sidebar, back-title-bar.tsx).
const TITLE_BAR_HEIGHT = 56;
// Must match --canvas in src/styles.css so the window never flashes a different color.
const WINDOW_BACKGROUND = '#faf9f7';
// Transparent so the caption buttons sit on whatever surface is beneath them.
const CAPTION_OVERLAY_COLOR = '#00000000';
// Must contrast with --canvas of the matching scheme in src/styles.css.
const CAPTION_SYMBOL_COLOR: Record<ColorScheme, string> = { light: '#3f3f46', dark: '#e7e5e4' };

// After bundling this module lives in dist-electron/main.js, next to preload.cjs.
const BUNDLE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const IS_MAC = process.platform === 'darwin';
// Vite serves public/ in dev and copies it into dist/ for production builds.
const WINDOW_ICON_PATH = process.env.VITE_DEV_SERVER_URL
  ? join(BUNDLE_DIRECTORY, '../public/icon.png')
  : join(BUNDLE_DIRECTORY, '../dist/icon.png');

function isColorScheme(value: unknown): value is ColorScheme {
  return COLOR_SCHEMES.includes(value as ColorScheme);
}

export function registerWindowIpc(): void {
  ipcMain.on(IPC_CHANNEL.windowSetCaptionScheme, (event, scheme: unknown) => {
    // macOS traffic lights have no overlay to recolor.
    if (IS_MAC || !isColorScheme(scheme)) return;
    BrowserWindow.fromWebContents(event.sender)?.setTitleBarOverlay({ symbolColor: CAPTION_SYMBOL_COLOR[scheme] });
    log('debug', 'Window', `Caption scheme set to ${scheme}`);
  });
}

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    title: 'Mudio',
    icon: WINDOW_ICON_PATH,
    show: false,
    backgroundColor: WINDOW_BACKGROUND,
    titleBarStyle: 'hidden',
    ...(IS_MAC
      ? { trafficLightPosition: { x: 18, y: 19 } }
      : { titleBarOverlay: { color: CAPTION_OVERLAY_COLOR, symbolColor: CAPTION_SYMBOL_COLOR.light, height: TITLE_BAR_HEIGHT } }),
    webPreferences: {
      preload: join(BUNDLE_DIRECTORY, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // Dropping a file outside the drop zone would otherwise navigate away from the app.
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) void window.loadURL(devServerUrl);
  else void window.loadFile(join(BUNDLE_DIRECTORY, '../dist/index.html'));
  return window;
}
