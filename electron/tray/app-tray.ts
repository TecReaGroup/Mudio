import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron';
import { MESSAGES } from '../../src/shared/i18n/message';
import type { SettingStore } from '../setting/setting-store';
import { APP_ICON_PATH } from '../window/app-window';
import type { LibraryWindow } from '../window/library-window';

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

/** Puts Mudio in the notification area: click to show the library, right-click to quit. */
export function createAppTray(libraryWindow: LibraryWindow, settingStore: SettingStore): Tray {
  const tray = new Tray(createTrayIcon());
  tray.setToolTip(app.getName());
  tray.on('click', () => libraryWindow.present());
  // Built on demand so the labels follow the current language setting.
  tray.on('right-click', () => {
    const message = MESSAGES[settingStore.current().language].tray;
    tray.popUpContextMenu(Menu.buildFromTemplate([
      { label: message.showLibrary, click: () => libraryWindow.present() },
      { type: 'separator' },
      { label: message.quit, click: () => app.quit() },
    ]));
  });
  return tray;
}
