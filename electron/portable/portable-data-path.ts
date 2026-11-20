import { join } from 'node:path';
import { app } from 'electron';

const PORTABLE_DATA_FOLDER_NAME = 'Mudio Data';

// Set by electron-builder's portable launcher to the folder holding the .exe; the app itself runs from a temp copy.
const portableExecutableDirectory = process.env.PORTABLE_EXECUTABLE_DIR;

// Keeps library, settings and logs beside the portable .exe instead of %APPDATA%, so the folder carries everything.
if (portableExecutableDirectory) {
  app.setPath('userData', join(portableExecutableDirectory, PORTABLE_DATA_FOLDER_NAME));
}
