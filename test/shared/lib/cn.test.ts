import { describe, expect, it } from 'vitest';
import { cn } from '../../../src/shared/lib/cn';

describe('cn', () => {
  it('keeps a custom text size and a text color together', () => {
    expect(cn('text-meta', 'text-secondary')).toBe('text-meta text-secondary');
  });

  it('lets a later custom text size override an earlier one', () => {
    expect(cn('text-meta', 'text-body')).toBe('text-body');
  });

  it('lets a later custom radius override an earlier one', () => {
    expect(cn('rounded-control', 'rounded-card')).toBe('rounded-card');
  });

  it('drops falsy entries', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2');
  });
});
