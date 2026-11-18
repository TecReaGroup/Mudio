import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { SUPPORTED_VIDEO_EXTENSIONS, type VideoEntry } from '../../src/shared/contract/mudio-contract';
import { describeError, log } from '../log/logger';
import { JsonFile } from '../shared/json-file';

const LIBRARY_FILE_NAME = 'library.json';
const THUMBNAIL_DIRECTORY_NAME = 'thumbnail';
const FOLDER_SCAN_MAX_DEPTH = 4;

interface LibraryDocument {
  version: 1;
  videos: VideoEntry[];
}

export function isSupportedVideoPath(filePath: string): boolean {
  const extension = extname(filePath).slice(1).toLowerCase();
  return (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(extension);
}

/** Id derives from the path, so re-importing the same file is idempotent. */
function videoIdForPath(absolutePath: string): string {
  const normalizedPath = process.platform === 'win32' ? absolutePath.toLowerCase() : absolutePath;
  return createHash('sha1').update(normalizedPath).digest('hex').slice(0, 16);
}

async function collectVideoFiles(directory: string, remainingDepth: number): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    log('warn', 'Library', `Skip unreadable folder: ${describeError(error)}`);
    return [];
  }
  const videoFiles: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory() && remainingDepth > 0) {
      videoFiles.push(...await collectVideoFiles(entryPath, remainingDepth - 1));
    } else if (entry.isFile() && isSupportedVideoPath(entry.name)) {
      videoFiles.push(entryPath);
    }
  }
  return videoFiles;
}

async function expandToVideoFiles(inputPath: string): Promise<string[]> {
  const absolutePath = resolve(inputPath);
  try {
    const stats = await stat(absolutePath);
    if (stats.isDirectory()) return collectVideoFiles(absolutePath, FOLDER_SCAN_MAX_DEPTH);
    return stats.isFile() && isSupportedVideoPath(absolutePath) ? [absolutePath] : [];
  } catch (error) {
    log('warn', 'Library', `Skip unreadable path: ${describeError(error)}`);
    return [];
  }
}

export class VideoLibrary {
  private constructor(
    private readonly document: JsonFile<LibraryDocument>,
    private readonly thumbnailDirectory: string,
    private readonly videos: Map<string, VideoEntry>,
    private readonly onChange: (videos: VideoEntry[]) => void,
  ) {}

  static async open(dataDirectory: string, onChange: (videos: VideoEntry[]) => void): Promise<VideoLibrary> {
    const document = new JsonFile<LibraryDocument>(join(dataDirectory, LIBRARY_FILE_NAME));
    const { videos } = await document.read({ version: 1, videos: [] });
    const thumbnailDirectory = join(dataDirectory, THUMBNAIL_DIRECTORY_NAME);
    await mkdir(thumbnailDirectory, { recursive: true });
    log('info', 'Library', `Loaded ${videos.length} videos`);
    return new VideoLibrary(document, thumbnailDirectory, new Map(videos.map(video => [video.id, video])), onChange);
  }

  /** Newest first. */
  list(): VideoEntry[] {
    return [...this.videos.values()].sort((left, right) => right.addedAt.localeCompare(left.addedAt));
  }

  find(videoId: string): VideoEntry | undefined {
    return this.videos.get(videoId);
  }

  thumbnailPath(videoId: string): string {
    return join(this.thumbnailDirectory, `${videoId}.jpg`);
  }

  /** Imports files and folders, returning the matching entries (existing ones included) in input order. */
  async importPaths(inputPaths: string[]): Promise<VideoEntry[]> {
    const filePaths = (await Promise.all(inputPaths.map(expandToVideoFiles))).flat();
    const importedById = new Map<string, VideoEntry>();
    let addedCount = 0;
    for (const filePath of filePaths) {
      const videoId = videoIdForPath(filePath);
      if (importedById.has(videoId)) continue;
      const existing = this.videos.get(videoId);
      if (existing) {
        importedById.set(videoId, existing);
        continue;
      }
      const { size } = await stat(filePath);
      const entry: VideoEntry = {
        id: videoId,
        filePath,
        title: basename(filePath, extname(filePath)),
        sizeBytes: size,
        addedAt: new Date().toISOString(),
        lastPlayedAt: null,
        durationSec: null,
        resumePositionSec: 0,
        hasThumbnail: false,
      };
      this.videos.set(videoId, entry);
      importedById.set(videoId, entry);
      addedCount += 1;
    }
    if (addedCount > 0) {
      log('info', 'Library', `Added ${addedCount} videos (${importedById.size} matched)`);
      await this.commit();
    }
    return [...importedById.values()];
  }

  async remove(videoId: string): Promise<void> {
    if (!this.videos.delete(videoId)) return;
    await rm(this.thumbnailPath(videoId), { force: true });
    log('info', 'Library', `Removed video ${videoId}`);
    await this.commit();
  }

  async recordPlayback(videoId: string, positionSec: number): Promise<void> {
    const video = this.videos.get(videoId);
    if (!video) return;
    this.videos.set(videoId, { ...video, resumePositionSec: positionSec, lastPlayedAt: new Date().toISOString() });
    await this.commit();
  }

  async attachPoster(videoId: string, jpegBytes: Uint8Array, durationSec: number | null): Promise<void> {
    const video = this.videos.get(videoId);
    if (!video) return;
    await writeFile(this.thumbnailPath(videoId), jpegBytes);
    this.videos.set(videoId, { ...video, hasThumbnail: true, durationSec: durationSec ?? video.durationSec });
    await this.commit();
  }

  private async commit(): Promise<void> {
    const videos = this.list();
    this.onChange(videos);
    await this.document.write({ version: 1, videos });
  }
}
