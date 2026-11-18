import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import type { LogLevel } from '../../src/shared/contract/mudio-contract';

const LOG_UTC_OFFSET_HOURS = 8;
const LOG_UTC_OFFSET_LABEL = '+08:00';
const LOG_DIRECTORY = app.isPackaged ? join(app.getPath('userData'), 'log') : join(process.cwd(), 'log');

let canWriteLogFile = true;
try {
  mkdirSync(LOG_DIRECTORY, { recursive: true });
} catch (error) {
  canWriteLogFile = false;
  console.error(`Cannot create log directory ${LOG_DIRECTORY}: ${describeError(error)}`);
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Timestamps are always Singapore time (+08:00), independent of the machine's timezone. */
function toSingaporeClock(date: Date): { day: string; time: string } {
  const shifted = new Date(date.getTime() + LOG_UTC_OFFSET_HOURS * 3_600_000).toISOString();
  return { day: shifted.slice(0, 10), time: shifted.slice(11, 19) };
}

export function log(level: LogLevel, module: string, message: string): void {
  const { day, time } = toSingaporeClock(new Date());
  const line = `[${day} ${time} ${LOG_UTC_OFFSET_LABEL}] [${level.toUpperCase()}] [${module}] - ${message}`;
  console[level](line);
  if (!canWriteLogFile) return;
  try {
    appendFileSync(join(LOG_DIRECTORY, `log_${day}.log`), `${line}\n`, 'utf8');
  } catch (error) {
    canWriteLogFile = false;
    console.error(`Cannot write log file: ${describeError(error)}`);
  }
}
