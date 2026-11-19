import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// Project rule: intermediate files live under ./temp, which .gitignore already excludes.
const TEMP_ROOT = join(process.cwd(), 'temp');

/** A fresh directory per test; call the returned remove() in afterEach. */
export async function createTempDirectory(prefix: string): Promise<{ path: string; remove: () => Promise<void> }> {
  await mkdir(TEMP_ROOT, { recursive: true });
  const path = await mkdtemp(join(TEMP_ROOT, `${prefix}-`));
  return { path, remove: () => rm(path, { recursive: true, force: true }) };
}

/** Writes a placeholder file; the library only reads its size and (mocked) metadata. */
export async function writeFakeVideo(filePath: string): Promise<string> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, 'not really a video');
  return filePath;
}
