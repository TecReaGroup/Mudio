/** Moves an id into the target's slot, shifting the ids between them by one. */
export function moveItem(ids: string[], movedId: string, targetId: string): string[] {
  const nextIds = ids.filter(id => id !== movedId);
  nextIds.splice(ids.indexOf(targetId), 0, movedId);
  return nextIds;
}

/**
 * Reorders currentIds by requestedIds. Requested ids that are not current are dropped, and current ids
 * the request misses (e.g. imported while it was in flight) keep their relative order at the end.
 */
export function arrangeIds(currentIds: string[], requestedIds: string[]): string[] {
  const current = new Set(currentIds);
  const arranged = [...new Set(requestedIds)].filter(id => current.has(id));
  const listed = new Set(arranged);
  return [...arranged, ...currentIds.filter(id => !listed.has(id))];
}
