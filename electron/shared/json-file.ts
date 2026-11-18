import { readFile, rename, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { describeError, log } from '../log/logger';

/** A JSON document on disk whose writes are serialized and atomic (temp file + rename). */
export class JsonFile<T> {
  private pendingWrite: Promise<void> = Promise.resolve();

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
    const content = JSON.stringify(value, null, 2);
    const temporaryPath = `${this.filePath}.tmp`;
    this.pendingWrite = this.pendingWrite
      .then(async () => {
        await writeFile(temporaryPath, content, 'utf8');
        await rename(temporaryPath, this.filePath);
      })
      .catch(error => log('error', 'Storage', `Failed to save ${basename(this.filePath)}: ${describeError(error)}`));
    return this.pendingWrite;
  }
}
