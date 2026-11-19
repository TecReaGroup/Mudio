import type {
  AppSetting,
  LibraryFolder,
  LibrarySnapshot,
  PlaybackRequest,
  Playlist,
  VideoEntry,
} from '../../src/shared/contract/mudio-contract';

/** No spaces, so nothing but an explicit clip/wrap rule keeps it inside its box. */
export const LONG_UNBROKEN_TEXT = 'A'.repeat(300);

const MEBIBYTE = 1024 * 1024;

/** Ids are "v1", "v2", …; title and path derive from the index unless overridden. */
export function buildVideo(index: number, overrides: Partial<VideoEntry> = {}): VideoEntry {
  return {
    id: `v${index}`,
    filePath: `D:\\Videos\\clip-${index}.mp4`,
    title: `Video ${index}`,
    sizeBytes: 50 * MEBIBYTE,
    addedAt: '2026-11-01T00:00:00.000Z',
    lastPlayedAt: null,
    durationSec: 125,
    resumePositionSec: 0,
    // A poster avoids the renderer's poster backfill, which needs real media decoding.
    hasThumbnail: true,
    ...overrides,
  };
}

export function buildVideos(count: number): VideoEntry[] {
  return Array.from({ length: count }, (_, offset) => buildVideo(offset + 1));
}

export function buildPlaylist(id: string, title: string, videoIds: string[]): Playlist {
  return { id, title, videoIds };
}

export function buildFolder(path: string, videoIds: string[], playlistTitles: string[] = []): LibraryFolder {
  return { path, videoIds, playlistTitles };
}

export function buildSnapshot(overrides: Partial<LibrarySnapshot> = {}): LibrarySnapshot {
  return { videos: [], recentIds: [], playlists: [], folders: [], ...overrides };
}

/** English, so assertions read the same as the source strings in message.ts. */
export function buildSetting(overrides: Partial<AppSetting> = {}): AppSetting {
  return { language: 'en', playbackOrder: 'sequential', resumePlayback: true, ...overrides };
}

export function buildRecentRequest(videoId: string, playlistIds: string[]): PlaybackRequest {
  return { videoId, playlistIds, playlistTitle: 'Recent', playlistId: null };
}
