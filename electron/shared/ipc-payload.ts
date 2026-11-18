export function expectString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`Invalid ${field}`);
  return value;
}

export function expectStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) throw new TypeError(`Invalid ${field}`);
  return value;
}

export function expectNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`Invalid ${field}`);
  return value;
}

export function expectBytes(value: unknown, field: string): Uint8Array {
  if (!(value instanceof Uint8Array)) throw new TypeError(`Invalid ${field}`);
  return value;
}
