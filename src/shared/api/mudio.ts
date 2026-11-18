import { buildMediaUrl, MEDIA_HOST, type MudioApi } from '../contract/mudio-contract';

declare global {
  interface Window {
    mudio: MudioApi;
  }
}

export const mudio = window.mudio;

export function videoSourceUrl(videoId: string): string {
  return buildMediaUrl(MEDIA_HOST.video, videoId);
}

export function thumbnailUrl(videoId: string): string {
  return buildMediaUrl(MEDIA_HOST.thumbnail, videoId);
}
