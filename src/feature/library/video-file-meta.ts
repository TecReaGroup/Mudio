import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { formatFileSize } from '../../shared/lib/format';

function fileExtension(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.');
  return dotIndex >= 0 ? filePath.slice(dotIndex + 1).toUpperCase() : '';
}

/** "MP4 · 1.2 GB" */
export function describeVideoFile(video: VideoEntry): string {
  return [fileExtension(video.filePath), formatFileSize(video.sizeBytes)].filter(Boolean).join(' · ');
}
