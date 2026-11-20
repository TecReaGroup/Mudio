import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import {
  FOLDER_SCAN_MAX_DEPTH,
  SUPPORTED_VIDEO_EXTENSIONS,
  type LibraryFolder,
  type LibrarySnapshot,
  type Playlist,
  type VideoEdit,
  type VideoEntry,
} from '../../src/shared/contract/mudio-contract';
import { arrangeIds } from '../../src/shared/lib/order';
import { describeError, log } from '../log/logger';
import { mapConcurrently } from '../shared/concurrency';
import { JsonFile } from '../shared/json-file';
import { fileNameTitle, readVideoMetadata } from './video-metadata';

const LIBRARY_FILE_NAME = 'library.json';
const THUMBNAIL_DIRECTORY_NAME = 'thumbnail';
// Matches libuv's default thread pool: more parallel parses would only queue behind it.
const METADATA_READ_CONCURRENCY = 4;
/**
 * 3: thumbnails prefer embedded cover art over a captured frame.
 * 2: titles come from embedded metadata. Version 1 titled every video by its file name.
 */
const LIBRARY_DOCUMENT_VERSION = 3;

/** A library folder as stored; its video ids are derived from file paths on every snapshot. */
type FolderBinding = Omit<LibraryFolder, 'videoIds'>;

interface LibraryDocument {
  version: 1 | 2 | typeof LIBRARY_DOCUMENT_VERSION;
  /** Stored in library order. */
  videos: VideoEntry[];
  /** Absent in documents written before library folders existed; plain paths predate folder playlists. */
  folders?: (string | FolderBinding)[];
  /** Absent in documents written before Recent could be arranged. */
  recentIds?: string[];
  /** Absent in documents written before playlists existed. */
  playlists?: Playlist[];
}

function emptyLibraryDocument(): LibraryDocument {
  return { version: LIBRARY_DOCUMENT_VERSION, videos: [] };
}

/** Valid JSON of the wrong shape (null, [], {}) yields an empty library: a throw here would abort startup. */
function parseLibraryDocument(value: unknown): LibraryDocument {
  const isLibraryShaped = typeof value === 'object' && value !== null && Array.isArray((value as LibraryDocument).videos);
  return isLibraryShaped ? value as LibraryDocument : emptyLibraryDocument();
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

/**
 * Prefix match rather than path.relative: snapshot() runs this for every video × folder on each commit.
 * Both paths are already resolved (folders via resolve(), files via join() under a resolved folder).
 */
function isInsideFolder(folderPath: string, filePath: string): boolean {
  const folderPrefix = folderPath.endsWith(sep) ? folderPath : folderPath + sep;
  return normalizePathCase(filePath).startsWith(normalizePathCase(folderPrefix));
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

async function goneVideoIds(videos: VideoEntry[]): Promise<string[]> {
  const goneFlags = await Promise.all(videos.map(video => isFileGone(video.filePath)));
  return videos.filter((_video, index) => goneFlags[index]).map(video => video.id);
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

/** Appends the videos the titled playlist lacks, creating the playlist if needed. */
function addToPlaylist(playlists: Playlist[], title: string, videoIds: string[]): Playlist[] {
  const target = playlists.find(playlist => playlist.title === title);
  if (!target) return videoIds.length > 0 ? [...playlists, { id: randomUUID(), title, videoIds }] : playlists;
  const memberIds = new Set(target.videoIds);
  const missingIds = videoIds.filter(videoId => !memberIds.has(videoId));
  if (missingIds.length === 0) return playlists;
  return playlists.map(playlist => playlist === target ? { ...playlist, videoIds: [...playlist.videoIds, ...missingIds] } : playlist);
}

function isSameFolder(left: string, right: string): boolean {
  return normalizePathCase(left) === normalizePathCase(right);
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
    /**
     * Folders rescanned on startup; removing one also removes the videos found under it.
     * Invariant: every video under a folder is in each of that folder's playlists.
     */
    private folders: FolderBinding[],
    /** Always a subset of the video ids. */
    private recentIds: string[],
    /** Never empty; their video ids are always a subset of the library's. */
    private playlists: Playlist[],
    private readonly onChange: (snapshot: LibrarySnapshot) => void,
  ) {}

  static async open(dataDirectory: string, onChange: (snapshot: LibrarySnapshot) => void): Promise<VideoLibrary> {
    const document = new JsonFile<LibraryDocument>(join(dataDirectory, LIBRARY_FILE_NAME));
    const { version, videos, folders = [], recentIds, playlists = [] } =
      parseLibraryDocument(await document.read(emptyLibraryDocument()));
    const thumbnailDirectory = join(dataDirectory, THUMBNAIL_DIRECTORY_NAME);
    await mkdir(thumbnailDirectory, { recursive: true });
    log('info', 'Library', `Loaded ${videos.length} videos from ${folders.length} library folders`);
    const videoById = new Map(videos.map(video => [video.id, video]));
    // A hand-edited document may list ids twice or name removed videos.
    const validRecentIds = recentIds ? [...new Set(recentIds)].filter(id => videoById.has(id)) : recentIdsByPlayTime(videos);
    const validPlaylists = playlists
      .map(playlist => ({ ...playlist, videoIds: [...new Set(playlist.videoIds)].filter(id => videoById.has(id)) }))
      .filter(playlist => playlist.videoIds.length > 0);
    const folderBindings = folders.map(folder => typeof folder === 'string' ? { path: folder, playlistTitles: [] } : folder);
    const library = new VideoLibrary(document, thumbnailDirectory, videoById, folderBindings, validRecentIds, validPlaylists, onChange);
    library.applyFolderPlaylists();
    if (version < LIBRARY_DOCUMENT_VERSION) {
      library.adoptEmbeddedMetadata(version)
        .catch(error => log('error', 'Library', `Embedded metadata migration failed: ${describeError(error)}`));
    }
    return library;
  }

  snapshot(): LibrarySnapshot {
    const folders = this.folders.map(folder => ({ ...folder, videoIds: this.folderVideoIds(folder.path) }));
    return { videos: this.list(), recentIds: this.recentIds, playlists: this.playlists, folders };
  }

  find(videoId: string): VideoEntry | undefined {
    return this.videos.get(videoId);
  }

  /** Remembers the folder and imports its videos; adding a folder already in the list only rescans it. */
  async addFolder(folderPath: string): Promise<void> {
    const absolutePath = resolve(folderPath);
    const isKnown = this.folders.some(folder => isSameFolder(folder.path, absolutePath));
    if (!isKnown) {
      this.folders = [...this.folders, { path: absolutePath, playlistTitles: [] }];
      log('info', 'Library', `Added library folder (${this.folders.length} total)`);
    }
    await this.importPaths([absolutePath]);
    await this.commit();
  }

  /** Forgets the folder and drops its videos, except those still covered by another library folder. */
  async removeFolder(folderPath: string): Promise<void> {
    const remainingFolders = this.folders.filter(folder => !isSameFolder(folder.path, folderPath));
    if (remainingFolders.length === this.folders.length) return;
    this.folders = remainingFolders;

    const orphanedIds = [...this.videos.values()]
      .filter(video => isInsideFolder(folderPath, video.filePath)
        && !remainingFolders.some(folder => isInsideFolder(folder.path, video.filePath)))
      .map(video => video.id);
    await this.dropVideos(orphanedIds);
    log('info', 'Library', `Removed library folder and ${orphanedIds.length} of its videos`);
    await this.commit();
  }

  /** Puts every video under the folder in exactly the titled playlists, creating missing ones and dropping any left empty. */
  async editFolderPlaylists(folderPath: string, playlistTitles: string[]): Promise<void> {
    const target = this.folders.find(folder => isSameFolder(folder.path, folderPath));
    if (!target) return;
    const droppedTitles = new Set(target.playlistTitles.filter(title => !playlistTitles.includes(title)));
    this.folders = this.folders.map(folder => folder === target ? { ...folder, playlistTitles } : folder);

    const leavingIds = new Set(this.folderVideoIds(target.path));
    this.playlists = this.playlists
      .map(playlist => droppedTitles.has(playlist.title)
        ? { ...playlist, videoIds: playlist.videoIds.filter(videoId => !leavingIds.has(videoId)) }
        : playlist)
      .filter(playlist => playlist.videoIds.length > 0);
    // Puts back videos that another folder still holds in a dropped playlist.
    this.applyFolderPlaylists();
    log('info', 'Library', `Edited library folder playlists: ${playlistTitles.length} kept, ${droppedTitles.size} dropped`);
    await this.commit();
  }

  /** Syncs the library with its folders: drops videos whose files are gone, then imports new ones. */
  async rescanFolders(): Promise<void> {
    if (this.folders.length === 0) return;
    const candidates = [...this.videos.values()]
      .filter(video => this.folders.some(folder => isInsideFolder(folder.path, video.filePath)));
    const goneIds = await goneVideoIds(candidates);
    if (goneIds.length > 0) {
      await this.dropVideos(goneIds);
      await this.commit();
    }

    const matched = await this.importPaths(this.folders.map(folder => folder.path));
    log('info', 'Library', `Rescanned ${this.folders.length} library folders: ${matched.length} videos found, ${goneIds.length} missing removed`);
  }

  /** Recent may hold videos outside every library folder (opened directly), which the folder rescan never checks. */
  async dropMissingRecent(): Promise<void> {
    const goneIds = await goneVideoIds(this.recentIds.flatMap(videoId => this.videos.get(videoId) ?? []));
    if (goneIds.length === 0) return;
    await this.dropVideos(goneIds);
    log('info', 'Library', `Removed ${goneIds.length} missing videos found in Recent`);
    await this.commit();
  }

  thumbnailPath(videoId: string): string {
    return join(this.thumbnailDirectory, `${videoId}.jpg`);
  }

  /** Imports files and folders, returning the matching entries (existing ones included) in input order. */
  async importPaths(inputPaths: string[]): Promise<VideoEntry[]> {
    const filePathById = new Map<string, string>();
    for (const filePath of (await Promise.all(inputPaths.map(expandToVideoFiles))).flat()) {
      const videoId = videoIdForPath(filePath);
      if (!filePathById.has(videoId)) filePathById.set(videoId, filePath);
    }
    const newEntries = await mapConcurrently(
      [...filePathById].filter(([videoId]) => !this.videos.has(videoId)),
      METADATA_READ_CONCURRENCY,
      ([videoId, filePath]) => this.readNewEntry(videoId, filePath),
    );
    // An import running alongside (e.g. the startup rescan) may have added the same file meanwhile.
    const addedEntries = newEntries.filter(entry => !this.videos.has(entry.id));
    for (const entry of addedEntries) this.videos.set(entry.id, entry);
    if (addedEntries.length > 0) {
      this.applyFolderPlaylists();
      log('info', 'Library', `Added ${addedEntries.length} videos (${filePathById.size} matched)`);
      await this.commit();
    }
    return [...filePathById.keys()].flatMap(videoId => this.videos.get(videoId) ?? []);
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
    // A folder's playlists hold the video regardless of what the edit asks for.
    const playlistTitles = [...new Set([...edit.playlistTitles, ...this.folderPlaylistTitles(video.filePath)])];
    this.videos.set(videoId, { ...video, title: edit.title });
    this.playlists = assignToPlaylists(this.playlists, videoId, playlistTitles);
    log('info', 'Library', `Edited video ${videoId}: in ${playlistTitles.length} playlists`);
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

  /** Restores the folder invariant without publishing; callers commit once afterwards. */
  private applyFolderPlaylists(): void {
    for (const folder of this.folders) {
      const videoIds = this.folderVideoIds(folder.path);
      for (const title of folder.playlistTitles) this.playlists = addToPlaylist(this.playlists, title, videoIds);
    }
  }

  private folderVideoIds(folderPath: string): string[] {
    return this.list().filter(video => isInsideFolder(folderPath, video.filePath)).map(video => video.id);
  }

  private folderPlaylistTitles(filePath: string): string[] {
    return this.folders.filter(folder => isInsideFolder(folder.path, filePath)).flatMap(folder => folder.playlistTitles);
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

  private async readNewEntry(videoId: string, filePath: string): Promise<VideoEntry> {
    const [{ size }, { title, coverBytes, durationSec }] = await Promise.all([stat(filePath), readVideoMetadata(filePath)]);
    return {
      id: videoId,
      filePath,
      title,
      sizeBytes: size,
      addedAt: new Date().toISOString(),
      lastPlayedAt: null,
      durationSec,
      resumePositionSec: 0,
      // Without cover art, the renderer's poster backfill captures a frame instead.
      hasThumbnail: coverBytes !== null && await this.storeCover(videoId, coverBytes),
    };
  }

  private async storeCover(videoId: string, coverBytes: Uint8Array): Promise<boolean> {
    try {
      await writeFile(this.thumbnailPath(videoId), coverBytes);
      return true;
    } catch (error) {
      log('warn', 'Library', `Cover skipped for ${videoId}: ${describeError(error)}`);
      return false;
    }
  }

  /** Runs once, in the background, on a document older than the current version; steps run in order. */
  private async adoptEmbeddedMetadata(version: LibraryDocument['version']): Promise<void> {
    if (version < 2) await this.adoptEmbeddedTitles();
    await this.adoptEmbeddedCovers();
  }

  /**
   * Files are probed one at a time to keep file handles bounded on large libraries;
   * a title the user already changed is left alone.
   */
  private async adoptEmbeddedTitles(): Promise<void> {
    let adoptedCount = 0;
    for (const { id, filePath } of this.list()) {
      const { title } = await readVideoMetadata(filePath);
      const video = this.videos.get(id);
      if (!video || video.title !== fileNameTitle(filePath) || title === video.title) continue;
      this.videos.set(id, { ...video, title });
      adoptedCount += 1;
    }
    log('info', 'Library', `Adopted ${adoptedCount} embedded titles`);
    await this.commit();
  }

  /** Replaces captured frames with cover art; videos without any keep their frame. */
  private async adoptEmbeddedCovers(): Promise<void> {
    let adoptedCount = 0;
    for (const { id, filePath } of this.list()) {
      const { coverBytes, durationSec } = await readVideoMetadata(filePath);
      if (!coverBytes || !this.videos.has(id) || !(await this.storeCover(id, coverBytes))) continue;
      // Re-read after the awaits: playback may have updated the entry meanwhile.
      const video = this.videos.get(id);
      if (!video) continue;
      this.videos.set(id, { ...video, hasThumbnail: true, durationSec: video.durationSec ?? durationSec });
      adoptedCount += 1;
    }
    log('info', 'Library', `Adopted ${adoptedCount} embedded covers`);
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
