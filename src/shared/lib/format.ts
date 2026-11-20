const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const wholeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = String(wholeSeconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

export function formatFileSize(bytes: number): string {
  let value = bytes;
  let unitIndex = 0;
  // Compare the displayed value, so 1023.96 KB rolls over to "1.0 MB" instead of showing "1024.0 KB".
  while (Number(value.toFixed(1)) >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${BYTE_UNITS[unitIndex]}`;
}
