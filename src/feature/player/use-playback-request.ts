import { useEffect, useRef } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { PlaybackRequest } from '../../shared/contract/mudio-contract';

/** Calls onRequest whenever the main window asks this player window to play something. */
export function usePlaybackRequest(onRequest: (request: PlaybackRequest) => void): void {
  const latestCallback = useRef(onRequest);

  useEffect(() => {
    latestCallback.current = onRequest;
  });

  useEffect(() => {
    const unsubscribe = mudio.player.onPlay(request => latestCallback.current(request));
    void mudio.player.takePendingRequest().then(request => {
      if (request) latestCallback.current(request);
    });
    return unsubscribe;
  }, []);
}
