import { videoSourceUrl } from '../../shared/api/mudio';
import { buildMediaUrl, MEDIA_HOST, TRANSCODE_RESPONSE } from '../../shared/contract/mudio-contract';

const POSTER_WIDTH = 480;
const POSTER_JPEG_QUALITY = 0.8;
const CAPTURE_TIMEOUT_MS = 15_000;

export interface CapturedPoster {
  jpegBytes: Uint8Array;
  /** null for streams without a known length (some WebM files report Infinity). */
  durationSec: number | null;
}

function waitForMediaEvent(video: HTMLVideoElement, eventName: 'loadeddata'): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => finish(new Error(`Timed out waiting for ${eventName}`)), CAPTURE_TIMEOUT_MS);
    const onEvent = () => finish();
    const onError = () => finish(new Error(`Media error code ${video.error?.code ?? 'unknown'}`));
    function finish(error?: Error) {
      window.clearTimeout(timer);
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener('error', onError);
      if (error) reject(error);
      else resolve();
    }
    video.addEventListener(eventName, onEvent);
    video.addEventListener('error', onError);
  });
}

/** Grabs the first frame from an off-screen <video>; rejects when Chromium cannot decode the codec. */
async function captureFirstFrameInBrowser(videoId: string): Promise<CapturedPoster> {
  const video = document.createElement('video');
  // Media is served with CORS headers; without this the canvas becomes tainted and cannot export.
  video.crossOrigin = 'anonymous';
  video.muted = true;
  // "metadata" may stop before any frame is decoded; loadeddata needs the first one.
  video.preload = 'auto';

  try {
    // loadeddata fires once the first frame is decoded and drawable; no seek needed.
    const firstFrameLoaded = waitForMediaEvent(video, 'loadeddata');
    video.src = videoSourceUrl(videoId);
    await firstFrameLoaded;

    const durationSec = Number.isFinite(video.duration) ? video.duration : null;

    const canvas = document.createElement('canvas');
    canvas.width = POSTER_WIDTH;
    canvas.height = Math.round(POSTER_WIDTH * (video.videoHeight / video.videoWidth || 9 / 16));
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', POSTER_JPEG_QUALITY));
    if (!blob) throw new Error('Canvas export failed');
    return { jpegBytes: new Uint8Array(await blob.arrayBuffer()), durationSec };
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}

async function extractFirstFrameWithFfmpeg(videoId: string): Promise<CapturedPoster> {
  const response = await fetch(buildMediaUrl(MEDIA_HOST.firstFrame, videoId));
  if (!response.ok) throw new Error(`ffmpeg frame extraction responded with status ${response.status}`);
  const durationSec = Number(response.headers.get(TRANSCODE_RESPONSE.durationHeader));
  return { jpegBytes: new Uint8Array(await response.arrayBuffer()), durationSec: Number.isFinite(durationSec) ? durationSec : null };
}

/** The video's first frame as a JPEG poster: decoded in the browser, or by the system's ffmpeg for codecs Chromium lacks. */
export function capturePoster(videoId: string): Promise<CapturedPoster> {
  return captureFirstFrameInBrowser(videoId).catch(() => extractFirstFrameWithFfmpeg(videoId));
}
