import { ipcMain } from 'electron';
import { IPC_CHANNEL, LOG_LEVELS, type LogLevel } from '../../src/shared/contract/mudio-contract';
import { log } from './logger';

function isLogLevel(value: unknown): value is LogLevel {
  return LOG_LEVELS.includes(value as LogLevel);
}

export function registerLogIpc(): void {
  ipcMain.on(IPC_CHANNEL.log, (_event, level: unknown, module: unknown, message: unknown) => {
    if (!isLogLevel(level)) return;
    log(level, `Renderer/${String(module)}`, String(message));
  });
}
