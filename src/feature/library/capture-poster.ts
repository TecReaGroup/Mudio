const POSTER_WIDTH = 480;
const POSTER_POSITION_RATIO = 0.1;
const POSTER_MAX_OFFSET_SEC = 30;
const POSTER_FALLBACK_OFFSET_SEC = 1;
const POSTER_JPEG_QUALITY = 0.8;
const CAPTURE_TIMEOUT_MS = 15_000;

export interface CapturedPoster {
  jpegBytes: Uint8Array;
  /** null for streams without a known length (some WebM files report Infinity). */
  durationSec: number | null;
}

function waitForMediaEvent(video: HTMLVideoElement, eventName: 'loadedmetadata' | 'seeked'): Promise<void> {
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

/** Grabs a representative frame from an off-screen <video>; rejects when the codec is unsupported. */
export async function capturePoster(sourceUrl: string): Promise<CapturedPoster> {
  const video = document.createElement('video');
  // Media is served with CORS headers; without this the canvas becomes tainted and cannot export.
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.preload = 'metadata';

  try {
    const metadataLoaded = waitForMediaEvent(video, 'loadedmetadata');
    video.src = sourceUrl;
    await metadataLoaded;

    const durationSec = Number.isFinite(video.duration) ? video.duration : null;
    const seeked = waitForMediaEvent(video, 'seeked');
    video.currentTime = durationSec === null
      ? POSTER_FALLBACK_OFFSET_SEC
      : Math.min(durationSec * POSTER_POSITION_RATIO, POSTER_MAX_OFFSET_SEC);
    await seeked;

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
