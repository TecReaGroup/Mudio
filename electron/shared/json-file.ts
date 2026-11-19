import { readFile, rename, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { describeError, log } from '../log/logger';

/**
 * A JSON document on disk whose writes are serialized and atomic (temp file + rename).
 * Writes arriving while one is in flight collapse into the latest value: a burst (poster backfill,
 * progress saves) costs at most one extra write, and each returned promise settles once its value is on disk.
 */
export class JsonFile<T> {
  private queuedValue: { value: T } | null = null;
  private activeFlush: Promise<void> | null = null;

  constructor(private readonly filePath: string) {}

  async read(fallback: T): Promise<T> {
    try {
      return JSON.parse(await readFile(this.filePath, 'utf8')) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log('warn', 'Storage', `Unreadable ${basename(this.filePath)}, using defaults: ${describeError(error)}`);
      }
      return fallback;
    }
  }

  write(value: T): Promise<void> {
    this.queuedValue = { value };
    this.activeFlush ??= this.flushQueue();
    return this.activeFlush;
  }

  private async flushQueue(): Promise<void> {
    const temporaryPath = `${this.filePath}.tmp`;
    while (this.queuedValue) {
      const { value } = this.queuedValue;
      this.queuedValue = null;
      try {
        await writeFile(temporaryPath, JSON.stringify(value, null, 2), 'utf8');
        await rename(temporaryPath, this.filePath);
      } catch (error) {
        log('error', 'Storage', `Failed to save ${basename(this.filePath)}: ${describeError(error)}`);
      }
    }
    this.activeFlush = null;
  }
}
