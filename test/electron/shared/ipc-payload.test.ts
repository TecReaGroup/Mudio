import { describe, expect, it } from 'vitest';
import {
  expectBytes,
  expectNonNegativeNumber,
  expectString,
  expectStringArray,
  expectText,
} from '../../../electron/shared/ipc-payload';

describe('ipc payload validation', () => {
  it('accepts a non-empty string and rejects an empty one or a non-string', () => {
    expect(expectString('v1', 'videoId')).toBe('v1');
    expect(() => expectString('', 'videoId')).toThrow('Invalid videoId');
    expect(() => expectString(42, 'videoId')).toThrow(TypeError);
  });

  it('trims text and rejects text that is blank once trimmed', () => {
    expect(expectText('  Trip  ', 'title')).toBe('Trip');
    expect(() => expectText('   ', 'title')).toThrow('Invalid title');
  });

  it('accepts only arrays of strings', () => {
    expect(expectStringArray(['a', 'b'], 'ids')).toEqual(['a', 'b']);
    expect(expectStringArray([], 'ids')).toEqual([]);
    expect(() => expectStringArray(['a', 1], 'ids')).toThrow(TypeError);
    expect(() => expectStringArray('a', 'ids')).toThrow(TypeError);
  });

  it.each([-1, NaN, Infinity, '5'])('rejects %s as a position', value => {
    expect(() => expectNonNegativeNumber(value, 'positionSec')).toThrow(TypeError);
  });

  it('accepts zero and positive finite positions', () => {
    expect(expectNonNegativeNumber(0, 'positionSec')).toBe(0);
    expect(expectNonNegativeNumber(12.5, 'positionSec')).toBe(12.5);
  });

  it('accepts only byte arrays as poster data', () => {
    const bytes = new Uint8Array([0xff, 0xd8]);
    expect(expectBytes(bytes, 'jpegBytes')).toBe(bytes);
    expect(() => expectBytes([0xff, 0xd8], 'jpegBytes')).toThrow(TypeError);
  });
});
