import { open } from 'node:fs/promises';
import { extname } from 'node:path';
import { describeError, log } from '../log/logger';
import { readMatroskaKeyframeTimes } from './matroska-keyframe';
import { readMp4KeyframeTimes } from './mp4-keyframe';

type KeyframeReader = typeof readMp4KeyframeTimes;

const KEYFRAME_READER_BY_EXTENSION: Record<string, KeyframeReader> = {
  '.mp4': readMp4KeyframeTimes,
  '.m4v': readMp4KeyframeTimes,
  '.mov': readMp4KeyframeTimes,
  '.mkv': readMatroskaKeyframeTimes,
  '.webm': readMatroskaKeyframeTimes,
};

/**
 * Ascending keyframe presentation times in seconds, read from the container index without decoding.
 * Empty when the format is not indexed or the index is unreadable: callers then seek exactly.
 */
export async function readKeyframeTimes(filePath: string): Promise<number[]> {
  const readKeyframes = KEYFRAME_READER_BY_EXTENSION[extname(filePath).toLowerCase()];
  if (!readKeyframes) return [];
  const startedAt = performance.now();
  const file = await open(filePath, 'r');
  try {
    const times = await readKeyframes(file, (await file.stat()).size);
    log('debug', 'Media', `Indexed ${times.length} keyframes in ${Math.round(performance.now() - startedAt)} ms`);
    return times;
  } catch (error) {
    log('warn', 'Media', `Cannot read keyframe index: ${describeError(error)}`);
    return [];
  } finally {
    await file.close();
  }
}
