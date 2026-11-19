import { app, ipcMain, shell } from 'electron';
import { IPC_CHANNEL } from '../../src/shared/contract/mudio-contract';
import { describeError, log } from '../log/logger';

/**
 * Windows 10+ forbids apps from setting file defaults themselves; the user must confirm in Settings.
 * registeredAppUser deep-links to our page there, resolved via RegisteredApplications written by build/installer.nsh.
 */
function defaultAppSettingUri(): string {
  return `ms-settings:defaultapps?registeredAppUser=${encodeURIComponent(app.getName())}`;
}

async function openDefaultAppSetting(): Promise<void> {
  log('info', 'DefaultPlayer', 'Opening Windows default app settings');
  try {
    await shell.openExternal(defaultAppSettingUri());
  } catch (error) {
    log('error', 'DefaultPlayer', `Failed to open default app settings: ${describeError(error)}`);
    throw error;
  }
}

export function registerDefaultPlayerIpc(): void {
  ipcMain.handle(IPC_CHANNEL.defaultPlayerOpenSetting, openDefaultAppSetting);
}
