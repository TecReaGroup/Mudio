import { useEffect, useRef } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';
import { capturePoster } from '../video-engine/capture-poster';

/** Generates missing thumbnails one video at a time, picking up videos imported mid-run. */
export function usePosterBackfill(videos: VideoEntry[]): void {
  const latestVideos = useRef(videos);
  const attemptedIds = useRef(new Set<string>());
  const isRunning = useRef(false);

  useEffect(() => {
    latestVideos.current = videos;
    if (isRunning.current) return;

    const nextPending = () =>
      latestVideos.current.find(video => !video.hasThumbnail && !attemptedIds.current.has(video.id));
    if (!nextPending()) return;

    isRunning.current = true;
    void (async () => {
      for (let video = nextPending(); video; video = nextPending()) {
        // Attempt each video once per session; unsupported codecs would fail forever.
        attemptedIds.current.add(video.id);
        try {
          const poster = await capturePoster(video.id);
          await mudio.library.attachPoster(video.id, poster.jpegBytes, poster.durationSec);
        } catch (error) {
          log('warn', 'Poster', `Thumbnail skipped for ${video.id}: ${describeError(error)}`);
        }
      }
      isRunning.current = false;
    })();
  }, [videos]);
}
