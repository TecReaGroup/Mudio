import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { LibraryFolder, LibrarySnapshot, Playlist, VideoEdit, VideoEntry } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';
import { arrangeIds } from '../../shared/lib/order';

interface VideoLibraryContextValue {
  /** Library order. Mutations go through mudio.library; this list updates from main-process pushes. */
  videos: VideoEntry[];
  /** Videos found under library folders, in library order; directly opened files only reach Recent. */
  folderVideos: VideoEntry[];
  /** Played videos in Recent's order. */
  recentVideos: VideoEntry[];
  playlists: Playlist[];
  folders: LibraryFolder[];
  findVideo: (videoId: string) => VideoEntry | undefined;
  /** Saves a new library order, showing it before main confirms so a dropped card never snaps back. */
  arrangeVideos: (videoIds: string[]) => void;
  /** Same as arrangeVideos, for Recent's order. */
  arrangeRecent: (videoIds: string[]) => void;
  /** Same as arrangeVideos, for one playlist's order. */
  arrangePlaylist: (playlistId: string, videoIds: string[]) => void;
  /** Stable across renders, so it can be handed to memoized cards. */
  editVideo: (videoId: string, edit: VideoEdit) => void;
  /** Stable across renders, so it can be handed to memoized cards. */
  removeFromRecent: (videoId: string) => void;
  /** Set when the initial load failed; the app still renders with an empty library. */
  loadError: string | null;
}

const VideoLibraryContext = createContext<VideoLibraryContextValue | null>(null);

// Not optimistic: the dialog has already closed, and main's push arrives within milliseconds.
function editVideo(videoId: string, edit: VideoEdit): void {
  mudio.library.editVideo(videoId, edit)
    .catch(error => log('error', 'Library', `Failed to edit video: ${describeError(error)}`));
}

function removeFromRecent(videoId: string): void {
  mudio.library.removeFromRecent(videoId)
    .catch(error => log('error', 'Library', `Failed to remove from Recent: ${describeError(error)}`));
}

function isSameEntry(left: VideoEntry, right: VideoEntry): boolean {
  return (Object.keys(right) as (keyof VideoEntry)[]).every(key => left[key] === right[key]);
}

/**
 * IPC pushes arrive as fresh copies of every entry. Keeping the previous object for unchanged entries
 * lets memoized cards and rows skip re-rendering when only one video changed (e.g. saved progress).
 */
function reuseUnchangedEntries(previous: LibrarySnapshot | null, next: LibrarySnapshot): LibrarySnapshot {
  if (!previous) return next;
  const previousById = new Map(previous.videos.map(video => [video.id, video]));
  return {
    ...next,
    videos: next.videos.map(video => {
      const previousVideo = previousById.get(video.id);
      return previousVideo && isSameEntry(previousVideo, video) ? previousVideo : video;
    }),
  };
}

function arrangeLibraryVideos(snapshot: LibrarySnapshot, videoIds: string[]): LibrarySnapshot {
  const videoById = new Map(snapshot.videos.map(video => [video.id, video]));
  const arrangedIds = arrangeIds([...videoById.keys()], videoIds);
  return { ...snapshot, videos: arrangedIds.map(videoId => videoById.get(videoId) as VideoEntry) };
}

export function VideoLibraryProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = mudio.library.onChanged(nextSnapshot => setSnapshot(current => reuseUnchangedEntries(current, nextSnapshot)));
    mudio.library.list()
      // A push that arrived during the initial fetch is newer, so keep it.
      .then(initialSnapshot => setSnapshot(current => current ?? initialSnapshot))
      .catch(error => {
        log('error', 'Library', `Failed to load library: ${describeError(error)}`);
        setLoadError(describeError(error));
        setSnapshot(current => current ?? { videos: [], recentIds: [], playlists: [], folders: [] });
      });
    return unsubscribe;
  }, []);

  const contextValue = useMemo(() => {
    const videos = snapshot?.videos ?? [];
    const videoById = new Map(videos.map(video => [video.id, video]));
    const findVideo = (videoId: string) => videoById.get(videoId);
    // A failed save leaves the optimistic order on screen; reloading puts back what main actually holds.
    const restoreFromMain = (error: unknown) => {
      log('error', 'Library', `Failed to save order: ${describeError(error)}`);
      mudio.library.list().then(setSnapshot).catch(() => undefined);
    };
    const folderVideoIds = new Set((snapshot?.folders ?? []).flatMap(folder => folder.videoIds));
    return {
      videos,
      folderVideos: videos.filter(video => folderVideoIds.has(video.id)),
      recentVideos: (snapshot?.recentIds ?? []).map(findVideo).filter((video): video is VideoEntry => video !== undefined),
      playlists: snapshot?.playlists ?? [],
      folders: snapshot?.folders ?? [],
      findVideo,
      arrangeVideos: (videoIds: string[]) => {
        setSnapshot(current => current && arrangeLibraryVideos(current, videoIds));
        mudio.library.arrange(videoIds).catch(restoreFromMain);
      },
      arrangeRecent: (videoIds: string[]) => {
        setSnapshot(current => current && { ...current, recentIds: arrangeIds(current.recentIds, videoIds) });
        mudio.library.arrangeRecent(videoIds).catch(restoreFromMain);
      },
      arrangePlaylist: (playlistId: string, videoIds: string[]) => {
        setSnapshot(current => current && {
          ...current,
          playlists: current.playlists.map(playlist =>
            playlist.id === playlistId ? { ...playlist, videoIds: arrangeIds(playlist.videoIds, videoIds) } : playlist),
        });
        mudio.library.arrangePlaylist(playlistId, videoIds).catch(restoreFromMain);
      },
      editVideo,
      removeFromRecent,
      loadError,
    };
  }, [snapshot, loadError]);

  // NOTE: The library is a local IPC read that finishes in milliseconds; rendering nothing until then
  // avoids a skeleton flash, which is what the "fast request" loading rule asks for.
  if (!snapshot) return null;
  return <VideoLibraryContext.Provider value={contextValue}>{children}</VideoLibraryContext.Provider>;
}

export function useVideoLibrary(): VideoLibraryContextValue {
  const context = useContext(VideoLibraryContext);
  if (!context) throw new Error('useVideoLibrary must be used inside VideoLibraryProvider');
  return context;
}
