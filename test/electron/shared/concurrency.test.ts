import { describe, expect, it } from 'vitest';
import { mapConcurrently } from '../../../electron/shared/concurrency';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('mapConcurrently', () => {
  it('keeps input order even when later items finish first', async () => {
    const mapped = await mapConcurrently([30, 10, 20, 0], 2, async waitMs => {
      await delay(waitMs);
      return waitMs * 2;
    });
    expect(mapped).toEqual([60, 20, 40, 0]);
  });

  it('never runs more than the limit at once', async () => {
    let inFlight = 0;
    let peakInFlight = 0;
    await mapConcurrently(Array.from({ length: 10 }, (_, index) => index), 3, async () => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await delay(5);
      inFlight -= 1;
    });
    expect(peakInFlight).toBe(3);
  });

  it('returns an empty array for no items', async () => {
    expect(await mapConcurrently([], 4, async item => item)).toEqual([]);
  });

  it('rejects when a call rejects', async () => {
    await expect(mapConcurrently([1, 2], 2, async item => {
      if (item === 2) throw new Error('unreadable');
      return item;
    })).rejects.toThrow('unreadable');
  });
});
