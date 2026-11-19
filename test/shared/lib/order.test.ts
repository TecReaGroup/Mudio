import { describe, expect, it } from 'vitest';
import { arrangeIds, moveItem } from '../../../src/shared/lib/order';

describe('moveItem', () => {
  it('moves an item forward into the target slot', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward into the target slot', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('keeps the order when an item is dropped onto itself', () => {
    expect(moveItem(['a', 'b', 'c'], 'b', 'b')).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate its input', () => {
    const ids = ['a', 'b', 'c'];
    moveItem(ids, 'a', 'c');
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

describe('arrangeIds', () => {
  it('applies the requested order', () => {
    expect(arrangeIds(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });

  it('drops requested ids that are not current', () => {
    expect(arrangeIds(['a', 'b'], ['ghost', 'b', 'a'])).toEqual(['b', 'a']);
  });

  it('appends current ids the request missed, keeping their relative order', () => {
    expect(arrangeIds(['a', 'b', 'c', 'd'], ['c', 'a'])).toEqual(['c', 'a', 'b', 'd']);
  });

  it('collapses duplicate requested ids', () => {
    expect(arrangeIds(['a', 'b'], ['b', 'b', 'a'])).toEqual(['b', 'a']);
  });
});
