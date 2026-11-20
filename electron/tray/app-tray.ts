import { app, ipcMain, nativeImage, screen, Tray, type NativeImage } from 'electron';
import { IPC_CHANNEL } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';
import { APP_ICON_PATH } from '../window/app-window';
import type { LibraryWindow } from '../window/library-window';
import { TrayMenuWindow } from './tray-menu-window';

// Windows draws tray icons at 16 logical px; one bitmap per common display scale keeps it sharp.
const TRAY_ICON_SIZE = 16;
const TRAY_ICON_SCALE_FACTORS = [1, 1.25, 1.5, 2];

function createTrayIcon(): NativeImage {
  const source = nativeImage.createFromPath(APP_ICON_PATH);
  const icon = nativeImage.createEmpty();
  for (const scaleFactor of TRAY_ICON_SCALE_FACTORS) {
    const width = Math.round(TRAY_ICON_SIZE * scaleFactor);
    icon.addRepresentation({ scaleFactor, buffer: source.resize({ width, height: width, quality: 'best' }).toPNG() });
  }
  return icon;
}

/** Puts Mudio in the notification area: click to show the library, right-click for the menu. */
export function createAppTray(libraryWindow: LibraryWindow): Tray {
  const tray = new Tray(createTrayIcon());
  const menu = new TrayMenuWindow();
  tray.setToolTip(app.getName());
  tray.on('click', () => libraryWindow.present());
  tray.on('right-click', () => menu.popUpAt(screen.getCursorScreenPoint()));

  ipcMain.on(IPC_CHANNEL.trayMenuOpenLibrary, () => {
    menu.hide();
    libraryWindow.present();
  });
  ipcMain.on(IPC_CHANNEL.trayMenuQuit, () => {
    log('info', 'Tray', 'Quit from tray menu');
    menu.hide();
    app.quit();
  });
  return tray;
}
