export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'mkv', 'mov', 'ogv'] as const;

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

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const LANGUAGES = ['zh-CN', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface AppSetting {
  theme: ThemePreference;
  language: Language;
  autoplayNext: boolean;
  resumePlayback: boolean;
}

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const IPC_CHANNEL = {
  libraryList: 'library:list',
  libraryPickFiles: 'library:pick-files',
  libraryPickFolder: 'library:pick-folder',
  libraryImportPaths: 'library:import-paths',
  libraryRemove: 'library:remove',
  libraryRecordPlayback: 'library:record-playback',
  libraryAttachPoster: 'library:attach-poster',
  libraryChanged: 'library:changed',
  settingLoad: 'setting:load',
  settingSave: 'setting:save',
  launchTakePending: 'launch:take-pending',
  launchOpenVideo: 'launch:open-video',
  log: 'log:write',
} as const;

export type Unsubscribe = () => void;

export interface MudioApi {
  platform: string;
  library: {
    list(): Promise<VideoEntry[]>;
    /** Shows a file picker; resolves to the picked videos (empty when cancelled). */
    pickAndImportFiles(): Promise<VideoEntry[]>;
    /** Shows a folder picker and imports every video found inside it. */
    pickAndImportFolder(): Promise<VideoEntry[]>;
    /** Accepts files and folders; unsupported files are skipped. */
    importPaths(paths: string[]): Promise<VideoEntry[]>;
    remove(videoId: string): Promise<void>;
    recordPlayback(videoId: string, positionSec: number): Promise<void>;
    attachPoster(videoId: string, jpegBytes: Uint8Array, durationSec: number | null): Promise<void>;
    onChanged(listener: (videos: VideoEntry[]) => void): Unsubscribe;
  };
  setting: {
    load(): Promise<AppSetting>;
    save(setting: AppSetting): Promise<void>;
  };
  launch: {
    /** Video the OS asked to open before the renderer was ready, consumed once. */
    takePendingVideoId(): Promise<string | null>;
    onOpenVideo(listener: (videoId: string) => void): Unsubscribe;
  };
  pathForFile(file: File): string;
  log(level: LogLevel, module: string, message: string): void;
}
