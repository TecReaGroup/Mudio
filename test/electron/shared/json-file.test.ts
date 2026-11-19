import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonFile } from '../../../electron/shared/json-file';
import { createTempDirectory } from '../../support/temp-directory';

vi.mock('../../../electron/log/logger', () => import('../../support/silent-logger'));

describe('JsonFile', () => {
  let directory: Awaited<ReturnType<typeof createTempDirectory>>;
  let filePath: string;

  beforeEach(async () => {
    directory = await createTempDirectory('json-file');
    filePath = join(directory.path, 'document.json');
  });

  afterEach(() => directory.remove());

  it('returns the fallback when the file does not exist', async () => {
    expect(await new JsonFile(filePath).read({ count: 0 })).toEqual({ count: 0 });
  });

  it('returns the fallback when the file is not valid JSON', async () => {
    await writeFile(filePath, '{ truncated', 'utf8');
    expect(await new JsonFile(filePath).read({ count: 0 })).toEqual({ count: 0 });
  });

  it('reads back what it wrote', async () => {
    const document = new JsonFile<{ count: number }>(filePath);
    await document.write({ count: 7 });
    expect(await document.read({ count: 0 })).toEqual({ count: 7 });
  });

  it('collapses a burst of writes into the latest value, settling every caller once it is on disk', async () => {
    const document = new JsonFile<{ count: number }>(filePath);
    const writes = [1, 2, 3, 4].map(count => document.write({ count }));
    await Promise.all(writes);
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual({ count: 4 });
  });

  it('accepts new writes after a burst has drained', async () => {
    const document = new JsonFile<{ count: number }>(filePath);
    await document.write({ count: 1 });
    await document.write({ count: 2 });
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual({ count: 2 });
  });
});
