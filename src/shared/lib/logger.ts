import { mudio } from '../api/mudio';
import type { LogLevel } from '../contract/mudio-contract';

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Logs to the devtools console and to the main process, which persists to ./log/. */
export function log(level: LogLevel, module: string, message: string): void {
  console[level](`[${level.toUpperCase()}] [${module}] - ${message}`);
  mudio.log(level, module, message);
}
