/** Where the library is browsing. */
export type LibrarySection = 'all' | 'recent' | 'playlist';
/** A section that lists videos, as opposed to the playlist index. */
export type VideoCollection = 'all' | 'recent';

/** Recent in its current order, with opened videos that are not in it yet appended at the end. */
export function buildRecentQueue(recentIds: string[], openedIds: string[]): string[] {
  const recent = new Set(recentIds);
  const newIds = [...new Set(openedIds)].filter(id => !recent.has(id));
  return [...recentIds, ...newIds];
}
