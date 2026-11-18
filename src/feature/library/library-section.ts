import type { VideoEntry } from '../../shared/contract/mudio-contract';

/** Where the library is browsing. Playlists open from the 'playlist' index, so they sit under its nav entry. */
export type LibrarySection = 'all' | 'playlist' | Playlist;
export type LibraryNavSection = 'all' | 'playlist';
/** A section that lists videos, as opposed to the playlist index. */
export type VideoCollection = 'all' | Playlist;

export const PLAYLISTS = ['recent'] as const;
export type Playlist = typeof PLAYLISTS[number];

export function navSectionOf(section: LibrarySection): LibraryNavSection {
  return section === 'all' || section === 'playlist' ? section : 'playlist';
}

export function selectCollectionVideos(videos: VideoEntry[], collection: VideoCollection): VideoEntry[] {
  if (collection === 'all') return videos;
  return videos
    .filter((video): video is VideoEntry & { lastPlayedAt: string } => video.lastPlayedAt !== null)
    .sort((left, right) => right.lastPlayedAt.localeCompare(left.lastPlayedAt));
}
