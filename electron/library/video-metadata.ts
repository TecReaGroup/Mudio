import { basename, extname } from 'node:path';
import { parseFile } from 'music-metadata';
import { describeError, log } from '../log/logger';

export function fileNameTitle(filePath: string): string {
  return basename(filePath, extname(filePath));
}

/** Title tag embedded in the container (MP4 ©nam, Matroska TITLE), or null when absent or unreadable. */
async function readEmbeddedTitle(filePath: string): Promise<string | null> {
  try {
    const { common } = await parseFile(filePath, { duration: false, skipCovers: true });
    return common.title?.trim() || null;
  } catch (error) {
    log('warn', 'Library', `Skip unreadable metadata: ${describeError(error)}`);
    return null;
  }
}

/** The embedded title when the file has one, otherwise the file name. */
export async function readVideoTitle(filePath: string): Promise<string> {
  return (await readEmbeddedTitle(filePath)) ?? fileNameTitle(filePath);
}
