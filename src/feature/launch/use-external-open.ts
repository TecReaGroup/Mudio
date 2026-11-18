import { useEffect, useRef } from 'react';
import { mudio } from '../../shared/api/mudio';

/** Calls onOpenVideo when the OS asks Mudio to open a file (double-click, "Open with", second launch). */
export function useExternalOpen(onOpenVideo: (videoId: string) => void): void {
  const latestCallback = useRef(onOpenVideo);

  useEffect(() => {
    latestCallback.current = onOpenVideo;
  });

  useEffect(() => {
    const unsubscribe = mudio.launch.onOpenVideo(videoId => latestCallback.current(videoId));
    void mudio.launch.takePendingVideoId().then(videoId => {
      if (videoId) latestCallback.current(videoId);
    });
    return unsubscribe;
  }, []);
}
