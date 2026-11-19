import { basename, extname } from 'node:path';
import { parseFile, selectCover } from 'music-metadata';
import { describeError, log } from '../log/logger';

export interface VideoMetadata {
  /** The embedded title (MP4 ©nam, Matroska TITLE), or the file name when absent. */
  title: string;
  /** Embedded cover art (MP4 covr, Matroska cover attachment), or null when the file has none. */
  coverBytes: Uint8Array | null;
  /** From the container header; null when it does not say. */
  durationSec: number | null;
}

export function fileNameTitle(filePath: string): string {
  return basename(filePath, extname(filePath));
}

/** One parse for everything the library reads from a file; unreadable metadata falls back to the file name. */
export async function readVideoMetadata(filePath: string): Promise<VideoMetadata> {
  try {
    const { common, format } = await parseFile(filePath, { duration: false });
    return {
      title: common.title?.trim() || fileNameTitle(filePath),
      coverBytes: selectCover(common.picture)?.data ?? null,
      durationSec: format.duration !== undefined && Number.isFinite(format.duration) ? format.duration : null,
    };
  } catch (error) {
    log('warn', 'Library', `Skip unreadable metadata: ${describeError(error)}`);
    return { title: fileNameTitle(filePath), coverBytes: null, durationSec: null };
  }
}
