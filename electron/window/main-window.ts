import type { BrowserWindow } from 'electron';
import { createAppWindow, type AppWindowChrome } from './app-window';

const MAIN_WINDOW_CHROME: AppWindowChrome = {
  size: { width: 1280, height: 800, minWidth: 900, minHeight: 560 },
  backgroundColor: '#e5e4e0',
  // Must match the h-14 title bar in src/shared/ui/browse-shell.tsx.
  titleBarHeight: 56,
  captionSymbolColor: '#1d1d1d',
  viewHash: '',
};

export function createMainWindow(): BrowserWindow {
  return createAppWindow(MAIN_WINDOW_CHROME);
}
