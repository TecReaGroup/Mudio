import type { VideoEntry } from '../../shared/contract/mudio-contract';

export type LibrarySection = 'all' | 'recent';

export const LIBRARY_SECTION_TITLE: Record<LibrarySection, string> = {
  all: '全部视频',
  recent: '最近播放',
};

export function selectSectionVideos(videos: VideoEntry[], section: LibrarySection): VideoEntry[] {
  if (section === 'all') return videos;
  return videos
    .filter((video): video is VideoEntry & { lastPlayedAt: string } => video.lastPlayedAt !== null)
    .sort((left, right) => right.lastPlayedAt.localeCompare(left.lastPlayedAt));
}
