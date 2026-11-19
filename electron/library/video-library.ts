import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import {
  FOLDER_SCAN_MAX_DEPTH,
  SUPPORTED_VIDEO_EXTENSIONS,
  type LibrarySnapshot,
  type Playlist,
  type VideoEdit,
  type VideoEntry,
} from '../../src/shared/contract/mudio-contract';
import { arrangeIds } from '../../src/shared/lib/order';
import { describeError, log } from '../log/logger';
import { JsonFile } from '../shared/json-file';
import { fileNameTitle, readVideoTitle } from './video-title';

const LIBRARY_FILE_NAME = 'library.json';
const THUMBNAIL_DIRECTORY_NAME = 'thumbnail';
/** 2: titles come from embedded metadata. Version 1 titled every video by its file name. */
const LIBRARY_DOCUMENT_VERSION = 2;

interface LibraryDocument {
  version: 1 | typeof LIBRARY_DOCUMENT_VERSION;
  /** Stored in library order. */
  videos: VideoEntry[];
  /** Absent in documents written before library folders existed. */
  folders?: string[];
  /** Absent in documents written before Recent could be arranged. */
  recentIds?: string[];
  /** Absent in documents written before playlists existed. */
  playlists?: Playlist[];
}

/** Recent's order before the user could arrange it: most recently played first. */
function recentIdsByPlayTime(videos: VideoEntry[]): string[] {
  return videos
    .filter((video): video is VideoEntry & { lastPlayedAt: string } => video.lastPlayedAt !== null)
    .sort((left, right) => right.lastPlayedAt.localeCompare(left.lastPlayedAt))
    .map(video => video.id);
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

/** Puts the video in exactly the titled playlists, creating missing ones and dropping any left empty. */
function assignToPlaylists(playlists: Playlist[], videoId: string, playlistTitles: string[]): Playlist[] {
  const wantedTitles = new Set(playlistTitles);
  const reassigned = playlists.map(playlist => {
    const isMember = playlist.videoIds.includes(videoId);
    const shouldBeMember = wantedTitles.has(playlist.title);
    if (isMember === shouldBeMember) return playlist;
    const videoIds = shouldBeMember ? [...playlist.videoIds, videoId] : playlist.videoIds.filter(id => id !== videoId);
    return { ...playlist, videoIds };
  });
  const existingTitles = new Set(playlists.map(playlist => playlist.title));
  const created = [...wantedTitles]
    .filter(title => !existingTitles.has(title))
    .map(title => ({ id: randomUUID(), title, videoIds: [videoId] }));
  return [...reassigned, ...created].filter(playlist => playlist.videoIds.length > 0);
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
    /** Insertion order is the library order. */
    private readonly videos: Map<string, VideoEntry>,
    /** Folders rescanned on startup; removing one also removes the videos found under it. */
    private folders: string[],
    /** Always a subset of the video ids. */
    private recentIds: string[],
    /** Never empty; their video ids are always a subset of the library's. */
    private playlists: Playlist[],
    private readonly onChange: (snapshot: LibrarySnapshot) => void,
  ) {}

  static async open(dataDirectory: string, onChange: (snapshot: LibrarySnapshot) => void): Promise<VideoLibrary> {
    const document = new JsonFile<LibraryDocument>(join(dataDirectory, LIBRARY_FILE_NAME));
    const { version, videos, folders = [], recentIds, playlists = [] } =
      await document.read({ version: LIBRARY_DOCUMENT_VERSION, videos: [] });
    const thumbnailDirectory = join(dataDirectory, THUMBNAIL_DIRECTORY_NAME);
    await mkdir(thumbnailDirectory, { recursive: true });
    log('info', 'Library', `Loaded ${videos.length} videos from ${folders.length} library folders`);
    const videoById = new Map(videos.map(video => [video.id, video]));
    // A hand-edited document may list ids twice or name removed videos.
    const validRecentIds = recentIds ? [...new Set(recentIds)].filter(id => videoById.has(id)) : recentIdsByPlayTime(videos);
    const validPlaylists = playlists
      .map(playlist => ({ ...playlist, videoIds: [...new Set(playlist.videoIds)].filter(id => videoById.has(id)) }))
      .filter(playlist => playlist.videoIds.length > 0);
    const library = new VideoLibrary(document, thumbnailDirectory, videoById, folders, validRecentIds, validPlaylists, onChange);
    if (version < LIBRARY_DOCUMENT_VERSION) {
      library.adoptEmbeddedTitles()
        .catch(error => log('error', 'Library', `Embedded title migration failed: ${describeError(error)}`));
    }
    return library;
  }

  snapshot(): LibrarySnapshot {
    return { videos: this.list(), recentIds: this.recentIds, playlists: this.playlists };
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
        title: await readVideoTitle(filePath),
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
    if (!this.videos.has(videoId)) return;
    await this.dropVideos([videoId]);
    log('info', 'Library', `Removed video ${videoId}`);
    await this.commit();
  }

  async arrange(videoIds: string[]): Promise<void> {
    const arrangedEntries = arrangeIds([...this.videos.keys()], videoIds)
      .map(videoId => [videoId, this.videos.get(videoId) as VideoEntry] as const);
    this.videos.clear();
    for (const [videoId, video] of arrangedEntries) this.videos.set(videoId, video);
    log('info', 'Library', `Arranged ${arrangedEntries.length} videos`);
    await this.commit();
  }

  async arrangeRecent(videoIds: string[]): Promise<void> {
    this.recentIds = arrangeIds(this.recentIds, videoIds);
    log('info', 'Library', `Arranged ${this.recentIds.length} recent videos`);
    await this.commit();
  }

  async arrangePlaylist(playlistId: string, videoIds: string[]): Promise<void> {
    this.playlists = this.playlists.map(playlist =>
      playlist.id === playlistId ? { ...playlist, videoIds: arrangeIds(playlist.videoIds, videoIds) } : playlist);
    log('info', 'Library', `Arranged playlist ${playlistId}`);
    await this.commit();
  }

  async editVideo(videoId: string, edit: VideoEdit): Promise<void> {
    const video = this.videos.get(videoId);
    if (!video) return;
    this.videos.set(videoId, { ...video, title: edit.title });
    this.playlists = assignToPlaylists(this.playlists, videoId, edit.playlistTitles);
    log('info', 'Library', `Edited video ${videoId}: in ${edit.playlistTitles.length} playlists`);
    await this.commit();
  }

  async removeFromRecent(videoId: string): Promise<void> {
    if (!this.recentIds.includes(videoId)) return;
    this.recentIds = this.recentIds.filter(id => id !== videoId);
    log('info', 'Library', `Removed video ${videoId} from Recent`);
    await this.commit();
  }

  async recordPlayback(videoId: string, positionSec: number): Promise<void> {
    const video = this.videos.get(videoId);
    if (!video) return;
    this.videos.set(videoId, { ...video, resumePositionSec: positionSec, lastPlayedAt: new Date().toISOString() });
    if (!this.recentIds.includes(videoId)) this.recentIds = [...this.recentIds, videoId];
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
    this.recentIds = this.recentIds.filter(videoId => this.videos.has(videoId));
    this.playlists = this.playlists
      .map(playlist => ({ ...playlist, videoIds: playlist.videoIds.filter(videoId => this.videos.has(videoId)) }))
      .filter(playlist => playlist.videoIds.length > 0);
    await Promise.all(videoIds.map(videoId => rm(this.thumbnailPath(videoId), { force: true })));
  }

  /**
   * Runs once, in the background, on a version 1 document. Files are probed one at a time to keep
   * file handles bounded on large libraries; a title the user already changed is left alone.
   */
  private async adoptEmbeddedTitles(): Promise<void> {
    let adoptedCount = 0;
    for (const { id, filePath } of this.list()) {
      const title = await readVideoTitle(filePath);
      const video = this.videos.get(id);
      if (!video || video.title !== fileNameTitle(filePath) || title === video.title) continue;
      this.videos.set(id, { ...video, title });
      adoptedCount += 1;
    }
    log('info', 'Library', `Adopted ${adoptedCount} embedded titles`);
    await this.commit();
  }

  private list(): VideoEntry[] {
    return [...this.videos.values()];
  }

  /** Publishes the library to every window, then saves. */
  private async commit(): Promise<void> {
    this.onChange(this.snapshot());
    await this.persist();
  }

  private persist(): Promise<void> {
    return this.document.write({
      version: LIBRARY_DOCUMENT_VERSION,
      videos: this.list(),
      folders: this.folders,
      recentIds: this.recentIds,
      playlists: this.playlists,
    });
  }
}
