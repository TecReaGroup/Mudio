/** Like `Promise.all(items.map(mapItem))`, but with at most `limit` calls in flight; keeps input order. */
export async function mapConcurrently<Item, Mapped>(
  items: Item[],
  limit: number,
  mapItem: (item: Item) => Promise<Mapped>,
): Promise<Mapped[]> {
  const mapped = new Array<Mapped>(items.length);
  let nextIndex = 0;
  const runWorker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      mapped[index] = await mapItem(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return mapped;
}
