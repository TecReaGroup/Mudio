import { describe, expect, it } from 'vitest';
import { formatDuration, formatFileSize } from '../../../src/shared/lib/format';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [59.9, '0:59'],
    [75, '1:15'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
  ])('formats %s seconds as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it.each([NaN, Infinity, -5])('shows 0:00 for an unusable duration (%s)', seconds => {
    expect(formatDuration(seconds)).toBe('0:00');
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [50 * 1024 * 1024, '50.0 MB'],
    [3 * 1024 ** 4, '3.0 TB'],
  ])('formats %s bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it('caps at the largest unit instead of running past it', () => {
    expect(formatFileSize(2048 * 1024 ** 4)).toBe('2048.0 TB');
  });

  // Just under a unit boundary, rounding to one decimal reaches 1024 of the smaller unit.
  it.each([
    [1024 * 1024 - 1, '1.0 MB'],
    [1024 ** 3 - 1, '1.0 GB'],
  ])('rolls %s bytes over to the next unit (%s) instead of showing 1024.0', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});
