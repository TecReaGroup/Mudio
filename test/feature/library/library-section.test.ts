import { describe, expect, it } from 'vitest';
import { buildRecentQueue } from '../../../src/feature/library/library-section';

describe('buildRecentQueue', () => {
  it('keeps Recent as is when the opened video is already in it', () => {
    expect(buildRecentQueue(['a', 'b', 'c'], ['b'])).toEqual(['a', 'b', 'c']);
  });

  it('appends opened videos that are not in Recent yet, in opening order', () => {
    expect(buildRecentQueue(['a'], ['c', 'b'])).toEqual(['a', 'c', 'b']);
  });

  it('appends a video opened twice in one drop only once', () => {
    expect(buildRecentQueue([], ['a', 'a', 'b'])).toEqual(['a', 'b']);
  });
});
