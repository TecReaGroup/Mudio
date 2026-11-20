import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';

const PORTABLE_DATA_FOLDER_NAME = 'Mudio Data';

// Only the NSIS installer leaves this beside the .exe; the portable .zip ships the same files without it.
function isPortableBuild(): boolean {
  if (process.platform !== 'win32' || !app.isPackaged) return false;
  const executableDirectory = dirname(process.execPath);
  return !existsSync(join(executableDirectory, `Uninstall ${app.getName()}.exe`));
}

// Keeps library, settings and logs beside the portable .exe instead of %APPDATA%, so the folder carries everything.
if (isPortableBuild()) {
  app.setPath('userData', join(dirname(process.execPath), PORTABLE_DATA_FOLDER_NAME));
}
