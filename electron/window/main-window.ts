import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, nativeTheme } from 'electron';

const WINDOW_SIZE = { width: 1280, height: 800, minWidth: 900, minHeight: 560 };
// Must match the h-13 title bars (browse-shell.tsx sidebar, back-title-bar.tsx).
const TITLE_BAR_HEIGHT = 60;
// Must match --canvas in src/styles.css so the window never flashes a different color.
const WINDOW_BACKGROUND = { light: '#faf9f7', dark: '#0c0a09' };
// Transparent so the caption buttons sit on whatever surface is beneath them.
const CAPTION_OVERLAY_COLOR = '#00000000';
const CAPTION_SYMBOL_COLOR = { light: '#3f3f46', dark: '#d4d4d8' };

// After bundling this module lives in dist-electron/main.js, next to preload.cjs.
const BUNDLE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const IS_MAC = process.platform === 'darwin';
// Vite serves public/ in dev and copies it into dist/ for production builds.
const WINDOW_ICON_PATH = process.env.VITE_DEV_SERVER_URL
  ? join(BUNDLE_DIRECTORY, '../public/icon.png')
  : join(BUNDLE_DIRECTORY, '../dist/icon.png');

function currentScheme(): 'light' | 'dark' {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function captionOverlay() {
  return { color: CAPTION_OVERLAY_COLOR, symbolColor: CAPTION_SYMBOL_COLOR[currentScheme()], height: TITLE_BAR_HEIGHT };
}

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    title: 'Mudio',
    icon: WINDOW_ICON_PATH,
    show: false,
    backgroundColor: WINDOW_BACKGROUND[currentScheme()],
    titleBarStyle: 'hidden',
    ...(IS_MAC
      ? { trafficLightPosition: { x: 18, y: 19 } }
      : { titleBarOverlay: captionOverlay() }),
    webPreferences: {
      preload: join(BUNDLE_DIRECTORY, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  const syncWithTheme = () => {
    window.setBackgroundColor(WINDOW_BACKGROUND[currentScheme()]);
    if (!IS_MAC) window.setTitleBarOverlay(captionOverlay());
  };
  nativeTheme.on('updated', syncWithTheme);
  window.on('closed', () => nativeTheme.off('updated', syncWithTheme));
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
