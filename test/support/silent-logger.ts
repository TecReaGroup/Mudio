import { vi } from 'vitest';

/**
 * Stands in for electron/log/logger.ts, which reads Electron's `app` at import and appends to ./log/.
 * Usage: vi.mock('<path>/electron/log/logger', () => import('<path>/test/support/silent-logger')).
 */
export const log = vi.fn();

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
