import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { FOLDER_SCAN_MAX_DEPTH, SUPPORTED_VIDEO_EXTENSIONS, type VideoEntry } from '../../src/shared/contract/mudio-contract';
import { describeError, log } from '../log/logger';
import { JsonFile } from '../shared/json-file';

const LIBRARY_FILE_NAME = 'library.json';
const THUMBNAIL_DIRECTORY_NAME = 'thumbnail';

interface LibraryDocument {
  version: 1;
  videos: VideoEntry[];
  /** Absent in documents written before library folders existed. */
  folders?: string[];
}

export function isSupportedVideoPath(filePath: string): boolean {
  const extension = extname(filePath).slice(1).toLowerCase();
  return (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(extension);
}

// Windows paths are case-insensitive, so ids and folder matching must ignore case there.
function normalizePathCase(absolutePath: string): string {
  return process.platform === 'win32' ? absolutePath.toLowerCase() : absolutePath;
}

/** Id derives from the path, so re-importing the same file is idempotent. */
function videoIdForPath(absolutePath: string): string {
  return createHash('sha1').update(normalizePathCase(absolutePath)).digest('hex').slice(0, 16);
}

function isInsideFolder(folderPath: string, filePath: string): boolean {
  const pathFromFolder = relative(normalizePathCase(folderPath), normalizePathCase(filePath));
  return pathFromFolder !== '' && !pathFromFolder.startsWith('..') && !isAbsolute(pathFromFolder);
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

/** Only a definite "does not exist" counts; permission or I/O errors keep the entry. */
async function isFileGone(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT';
  }
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
    /** Folders rescanned on startup; removing one also removes the videos found under it. */
    private folders: string[],
    private readonly onChange: (videos: VideoEntry[]) => void,
  ) {}

  static async open(dataDirectory: string, onChange: (videos: VideoEntry[]) => void): Promise<VideoLibrary> {
    const document = new JsonFile<LibraryDocument>(join(dataDirectory, LIBRARY_FILE_NAME));
    const { videos, folders = [] } = await document.read({ version: 1, videos: [] });
    const thumbnailDirectory = join(dataDirectory, THUMBNAIL_DIRECTORY_NAME);
    await mkdir(thumbnailDirectory, { recursive: true });
    log('info', 'Library', `Loaded ${videos.length} videos from ${folders.length} library folders`);
    return new VideoLibrary(document, thumbnailDirectory, new Map(videos.map(video => [video.id, video])), folders, onChange);
  }

  /** Newest first. */
  list(): VideoEntry[] {
    return [...this.videos.values()].sort((left, right) => right.addedAt.localeCompare(left.addedAt));
  }

  find(videoId: string): VideoEntry | undefined {
    return this.videos.get(videoId);
  }

  listFolders(): string[] {
    return this.folders;
  }

  /** Remembers the folder and imports its videos; adding a folder already in the list only rescans it. */
  async addFolder(folderPath: string): Promise<string[]> {
    const absolutePath = resolve(folderPath);
    const isKnown = this.folders.some(folder => normalizePathCase(folder) === normalizePathCase(absolutePath));
    if (!isKnown) {
      this.folders = [...this.folders, absolutePath];
      log('info', 'Library', `Added library folder (${this.folders.length} total)`);
    }
    await this.importPaths([absolutePath]);
    await this.persist();
    return this.folders;
  }

  /** Forgets the folder and drops its videos, except those still covered by another library folder. */
  async removeFolder(folderPath: string): Promise<string[]> {
    const remainingFolders = this.folders.filter(folder => normalizePathCase(folder) !== normalizePathCase(folderPath));
    if (remainingFolders.length === this.folders.length) return this.folders;
    this.folders = remainingFolders;

    const orphanedIds = [...this.videos.values()]
      .filter(video => isInsideFolder(folderPath, video.filePath)
        && !remainingFolders.some(folder => isInsideFolder(folder, video.filePath)))
      .map(video => video.id);
    await this.dropVideos(orphanedIds);
    log('info', 'Library', `Removed library folder and ${orphanedIds.length} of its videos`);
    await this.commit();
    return this.folders;
  }

  /** Syncs the library with its folders: drops videos whose files are gone, then imports new ones. */
  async rescanFolders(): Promise<void> {
    if (this.folders.length === 0) return;
    const candidates = [...this.videos.values()]
      .filter(video => this.folders.some(folder => isInsideFolder(folder, video.filePath)));
    const goneIds = (await Promise.all(candidates.map(async video => (await isFileGone(video.filePath)) ? video.id : null)))
      .filter((videoId): videoId is string => videoId !== null);
    if (goneIds.length > 0) {
      await this.dropVideos(goneIds);
      await this.commit();
    }

    const matched = await this.importPaths(this.folders);
    log('info', 'Library', `Rescanned ${this.folders.length} library folders: ${matched.length} videos found, ${goneIds.length} missing removed`);
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

  /** Removes entries and their thumbnails without publishing; callers commit once afterwards. */
  private async dropVideos(videoIds: string[]): Promise<void> {
    for (const videoId of videoIds) this.videos.delete(videoId);
    await Promise.all(videoIds.map(videoId => rm(this.thumbnailPath(videoId), { force: true })));
  }

  /** Publishes the video list to every window, then saves. */
  private async commit(): Promise<void> {
    this.onChange(this.list());
    await this.persist();
  }

  private persist(): Promise<void> {
    return this.document.write({ version: 1, videos: this.list(), folders: this.folders });
  }
}
