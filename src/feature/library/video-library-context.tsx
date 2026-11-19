import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';

interface VideoLibraryContextValue {
  /** Newest first. Mutations go through mudio.library; this list updates from main-process pushes. */
  videos: VideoEntry[];
  findVideo: (videoId: string) => VideoEntry | undefined;
  /** Set when the initial load failed; the app still renders with an empty library. */
  loadError: string | null;
}

const VideoLibraryContext = createContext<VideoLibraryContextValue | null>(null);

export function VideoLibraryProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<VideoEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = mudio.library.onChanged(setVideos);
    mudio.library.list()
      // A push that arrived during the initial fetch is newer, so keep it.
      .then(initialVideos => setVideos(current => current ?? initialVideos))
      .catch(error => {
        log('error', 'Library', `Failed to load library: ${describeError(error)}`);
        setLoadError(describeError(error));
        setVideos(current => current ?? []);
      });
    return unsubscribe;
  }, []);

  const contextValue = useMemo(() => {
    const videoById = new Map((videos ?? []).map(video => [video.id, video]));
    return { videos: videos ?? [], findVideo: (videoId: string) => videoById.get(videoId), loadError };
  }, [videos, loadError]);

  // NOTE: The library is a local IPC read that finishes in milliseconds; rendering nothing until then
  // avoids a skeleton flash, which is what the "fast request" loading rule asks for.
  if (!videos) return null;
  return <VideoLibraryContext.Provider value={contextValue}>{children}</VideoLibraryContext.Provider>;
}

export function useVideoLibrary(): VideoLibraryContextValue {
  const context = useContext(VideoLibraryContext);
  if (!context) throw new Error('useVideoLibrary must be used inside VideoLibraryProvider');
  return context;
}
