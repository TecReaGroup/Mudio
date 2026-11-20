import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow } from 'electron';

// Transparent so the caption buttons sit on whatever surface is beneath them.
const CAPTION_OVERLAY_COLOR = '#00000000';
const TRAFFIC_LIGHT_HEIGHT = 18;
const TRAFFIC_LIGHT_X = 18;

// After bundling this module lives in dist/electron/main.js, next to preload.cjs.
const BUNDLE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const IS_MAC = process.platform === 'darwin';
const RENDERER_DIRECTORY = join(BUNDLE_DIRECTORY, '../renderer');
// Vite serves public/ in dev and copies it into dist/renderer/ for production builds.
export const APP_ICON_PATH = process.env.VITE_DEV_SERVER_URL
  ? join(BUNDLE_DIRECTORY, '../../public/icon.png')
  : join(RENDERER_DIRECTORY, 'icon.png');

export interface AppWindowChrome {
  size: { width: number; height: number; minWidth: number; minHeight: number };
  /** Must match --canvas of the page's scheme in src/styles.css so the window never flashes a different color. */
  backgroundColor: string;
  /** Must match the renderer's title bar height so caption buttons line up with it. */
  titleBarHeight: number;
  /** Must contrast with the title bar beneath the caption buttons; ignored on macOS. */
  captionSymbolColor: string;
  /** Renderer entry selected by URL hash; empty for the library view. */
  viewHash: string;
}

/** Frameless, initially hidden app window with the shared security, navigation and loading setup; the owner decides when it appears. */
export function createAppWindow(chrome: AppWindowChrome): BrowserWindow {
  const window = new BrowserWindow({
    ...chrome.size,
    title: 'Mudio',
    icon: APP_ICON_PATH,
    show: false,
    backgroundColor: chrome.backgroundColor,
    titleBarStyle: 'hidden',
    ...(IS_MAC
      ? { trafficLightPosition: { x: TRAFFIC_LIGHT_X, y: Math.round((chrome.titleBarHeight - TRAFFIC_LIGHT_HEIGHT) / 2) } }
      : { titleBarOverlay: { color: CAPTION_OVERLAY_COLOR, symbolColor: chrome.captionSymbolColor, height: chrome.titleBarHeight } }),
    webPreferences: {
      preload: join(BUNDLE_DIRECTORY, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // Dropping a file outside the drop zone would otherwise navigate away from the app.
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    const viewUrl = new URL(devServerUrl);
    viewUrl.hash = chrome.viewHash;
    void window.loadURL(viewUrl.toString());
  } else {
    void window.loadFile(join(RENDERER_DIRECTORY, 'index.html'), { hash: chrome.viewHash });
  }
  return window;
}
