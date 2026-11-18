import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, nativeTheme } from 'electron';

const WINDOW_SIZE = { width: 1280, height: 800, minWidth: 900, minHeight: 560 };
const TITLE_BAR_HEIGHT = 40;
// Must match --background in src/styles.css so the native caption buttons blend in.
const TITLE_BAR_PALETTE = {
  light: { color: '#ffffff', symbolColor: '#3f3f46' },
  dark: { color: '#09090b', symbolColor: '#d4d4d8' },
};

// After bundling this module lives in dist-electron/main.js, next to preload.cjs.
const BUNDLE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const IS_MAC = process.platform === 'darwin';

function currentPalette() {
  return nativeTheme.shouldUseDarkColors ? TITLE_BAR_PALETTE.dark : TITLE_BAR_PALETTE.light;
}

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    title: 'Mudio',
    show: false,
    backgroundColor: currentPalette().color,
    titleBarStyle: 'hidden',
    ...(IS_MAC
      ? { trafficLightPosition: { x: 16, y: 13 } }
      : { titleBarOverlay: { ...currentPalette(), height: TITLE_BAR_HEIGHT } }),
    webPreferences: {
      preload: join(BUNDLE_DIRECTORY, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  const syncWithTheme = () => {
    window.setBackgroundColor(currentPalette().color);
    if (!IS_MAC) window.setTitleBarOverlay({ ...currentPalette(), height: TITLE_BAR_HEIGHT });
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
