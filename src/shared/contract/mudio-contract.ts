export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'mkv', 'mov', 'ogv'] as const;

/** Subfolder levels scanned below an imported or library folder. */
export const FOLDER_SCAN_MAX_DEPTH = 5;

export const MEDIA_SCHEME = 'mudio-media';

export const MEDIA_HOST = {
  video: 'video',
  thumbnail: 'thumbnail',
} as const;

export type MediaHost = (typeof MEDIA_HOST)[keyof typeof MEDIA_HOST];

export function buildMediaUrl(host: MediaHost, videoId: string): string {
  return `${MEDIA_SCHEME}://${host}/${videoId}`;
}

export interface VideoEntry {
  id: string;
  filePath: string;
  title: string;
  sizeBytes: number;
  addedAt: string;
  lastPlayedAt: string | null;
  durationSec: number | null;
  resumePositionSec: number;
  hasThumbnail: boolean;
}

/** A named group of videos. Exists only while it holds at least one video. */
export interface Playlist {
  id: string;
  /** Unique across playlists; videos are assigned to playlists by title. */
  title: string;
  /** In playlist order; a newly added video is appended. */
  videoIds: string[];
}

export interface LibraryFolder {
  path: string;
  /** Every video under the folder stays in these playlists; only the folder can take it out. */
  playlistTitles: string[];
  /** Library videos found under the folder, in library order. */
  videoIds: string[];
}

export interface LibrarySnapshot {
  /** In the order the user arranged; newly imported videos are appended. */
  videos: VideoEntry[];
  /** Played videos in Recent's order, which the user arranges too; a first play is appended. */
  recentIds: string[];
  playlists: Playlist[];
  /** Folders the library keeps in sync with. */
  folders: LibraryFolder[];
}

export interface VideoEdit {
  title: string;
  /** Every playlist the video should be in; titles no playlist has yet create one. */
  playlistTitles: string[];
}

export const LANGUAGES =['zh-CN', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** What happens when a video ends: stop, replay it, or move on to the next one in the playlist. */
export const PLAYBACK_ORDERS = ['play-once', 'repeat-one', 'sequential'] as const;
export type PlaybackOrder = (typeof PLAYBACK_ORDERS)[number];

export interface AppSetting {
  language: Language;
  playbackOrder: PlaybackOrder;
  resumePlayback: boolean;
}

/** URL hash that boots the renderer into the player window instead of the library. */
export const PLAYER_VIEW_HASH = 'player';
/** URL hash that boots the renderer into the tray icon's pop-up menu. */
export const TRAY_MENU_VIEW_HASH = 'tray-menu';

export interface PlaybackRequest {
  videoId: string;
  /** Snapshotted when playback starts so the order stays stable while "recent" reshuffles. */
  playlistIds: string[];
  /** Resolved by the sender, which knows what the queue is: Recent, or the playlist it was started from. */
  playlistTitle: string;
  /** The playlist the queue was started from, or null for Recent; reordering the queue saves back to it. */
  playlistId: string | null;
}

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const IPC_CHANNEL = {
  libraryList: 'library:list',
  libraryImportPaths: 'library:import-paths',
  libraryRemove: 'library:remove',
  libraryArrange: 'library:arrange',
  libraryArrangeRecent: 'library:arrange-recent',
  libraryArrangePlaylist: 'library:arrange-playlist',
  libraryEditVideo: 'library:edit-video',
  libraryRemoveFromRecent: 'library:remove-from-recent',
  libraryRecordPlayback: 'library:record-playback',
  libraryAttachPoster: 'library:attach-poster',
  mediaKeyframeTimes: 'media:keyframe-times',
  libraryChanged: 'library:changed',
  libraryFolderPickAndAdd: 'library-folder:pick-and-add',
  libraryFolderRemove: 'library-folder:remove',
  libraryFolderEditPlaylists: 'library-folder:edit-playlists',
  libraryFolderRescan: 'library-folder:rescan',
  settingLoad: 'setting:load',
  settingSave: 'setting:save',
  settingChanged: 'setting:changed',
  launchTakePending: 'launch:take-pending',
  launchOpenVideo: 'launch:open-video',
  playerOpen: 'player:open',
  playerTakePending: 'player:take-pending',
  playerPlay: 'player:play',
  playerReturnToLibrary: 'player:return-to-library',
  defaultPlayerOpenSetting: 'default-player:open-setting',
  trayMenuOpenLibrary: 'tray-menu:open-library',
  trayMenuQuit: 'tray-menu:quit',
  log: 'log:write',
} as const;

export type Unsubscribe = () => void;

export interface MudioApi {
  platform: string;
  library: {
    list(): Promise<LibrarySnapshot>;
    /** Accepts files and folders; unsupported files are skipped. */
    importPaths(paths: string[]): Promise<VideoEntry[]>;
    remove(videoId: string): Promise<void>;
    /** Saves the library order; see arrangeIds for how unknown or missing ids are handled. */
    arrange(videoIds: string[]): Promise<void>;
    /** Saves Recent's order; ids of videos never played are ignored. */
    arrangeRecent(videoIds: string[]): Promise<void>;
    /** Saves a playlist's order; ids of videos not in it are ignored. */
    arrangePlaylist(playlistId: string, videoIds: string[]): Promise<void>;
    /** Renames the video and sets exactly which playlists hold it; playlists left empty are removed. */
    editVideo(videoId: string, edit: VideoEdit): Promise<void>;
    /** Forgets the playback record only; the video stays in the library and its file is untouched. */
    removeFromRecent(videoId: string): Promise<void>;
    recordPlayback(videoId: string, positionSec: number): Promise<void>;
    attachPoster(videoId: string, jpegBytes: Uint8Array, durationSec: number | null): Promise<void>;
    onChanged(listener: (snapshot: LibrarySnapshot) => void): Unsubscribe;
  };
  /** Folders the library keeps in sync with: scanned on startup and on demand. */
  /** Folders arrive with the library snapshot; changes here are pushed back through library.onChanged. */
  libraryFolder: {
    /** Shows a folder picker, remembers the folder and imports its videos. */
    pickAndAdd(): Promise<void>;
    /** Forgets the folder and removes its videos from the library; files on disk are untouched. */
    remove(folderPath: string): Promise<void>;
    /** Sets exactly which playlists hold every video under the folder; titles no playlist has yet create one. */
    editPlaylists(folderPath: string, playlistTitles: string[]): Promise<void>;
    rescan(): Promise<void>;
  };
  media: {
    /** Ascending keyframe times in seconds from the container index; empty when the file has none to offer. */
    keyframeTimes(videoId: string): Promise<number[]>;
  };
  setting: {
    load(): Promise<AppSetting>;
    save(setting: AppSetting): Promise<void>;
    onChanged(listener: (setting: AppSetting) => void): Unsubscribe;
  };
  launch: {
    /** Video the OS asked to open before the renderer was ready, consumed once. */
    takePendingVideoId(): Promise<string | null>;
    onOpenVideo(listener: (videoId: string) => void): Unsubscribe;
  };
  player: {
    /** Plays in the player window, opening it if needed; the library window then hides to the tray. */
    open(request: PlaybackRequest): Promise<void>;
    /** Request made before the player window's renderer was ready, consumed once. */
    takePendingRequest(): Promise<PlaybackRequest | null>;
    onPlay(listener: (request: PlaybackRequest) => void): Unsubscribe;
    /** Closes the player window and brings the library window back to the front. */
    returnToLibrary(): void;
  };
  /** Windows only: apps cannot claim file types themselves, so this opens Settings at Mudio's default-app page. */
  defaultPlayer: {
    openSetting(): Promise<void>;
  };
  /** Actions of the tray icon's pop-up menu; each one also dismisses the menu. */
  trayMenu: {
    openLibrary(): void;
    quit(): void;
  };
  pathForFile(file: File): string;
  log(level: LogLevel, module: string, message: string): void;
}
