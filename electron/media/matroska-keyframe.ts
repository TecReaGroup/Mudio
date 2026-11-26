import type { FileHandle } from 'node:fs/promises';

const ELEMENT_ID = {
  ebml: 0x1a45dfa3,
  segment: 0x18538067,
  seekHead: 0x114d9b74,
  seek: 0x4dbb,
  seekId: 0x53ab,
  seekPosition: 0x53ac,
  info: 0x1549a966,
  timestampScale: 0x2ad7b1,
  cluster: 0x1f43b675,
  cues: 0x1c53bb6b,
  cuePoint: 0xbb,
  cueTime: 0xb3,
} as const;

const DEFAULT_TIMESTAMP_SCALE_NS = 1_000_000;
const NS_PER_SEC = 1e9;
// An ID takes at most 4 bytes and a size at most 8.
const ELEMENT_HEADER_MAX_BYTES = 12;
// Cues and Info are small; anything larger is a corrupt size field.
const ELEMENT_BODY_MAX_BYTES = 32 * 1024 * 1024;

interface Element {
  id: number;
  bodyStart: number;
  /** Infinity for unknown-size elements, which only live streams write. */
  end: number;
}

/** EBML variable-length integer: the leading zero bits of the first byte give the extra byte count. */
function readVint(buffer: Buffer, offset: number, keepMarker: boolean): { value: number; length: number; isAllOnes: boolean } {
  const first = buffer[offset];
  const length = Math.clz32(first) - 23;
  if (length < 1 || length > 8) throw new Error(`Invalid EBML vint at ${offset}`);
  const markerMask = 0xff >> length;
  let value = keepMarker ? first : first & markerMask;
  let isAllOnes = (first & markerMask) === markerMask;
  for (let index = 1; index < length; index++) {
    value = value * 256 + buffer[offset + index];
    isAllOnes &&= buffer[offset + index] === 0xff;
  }
  return { value, length, isAllOnes };
}

function parseElementHeader(buffer: Buffer, offset: number, absoluteOffset: number): Element & { headerLength: number } {
  const id = readVint(buffer, offset, true);
  const size = readVint(buffer, offset + id.length, false);
  const headerLength = id.length + size.length;
  const bodyStart = absoluteOffset + headerLength;
  return { id: id.value, bodyStart, end: size.isAllOnes ? Infinity : bodyStart + size.value, headerLength };
}

function* childElements(buffer: Buffer, start: number, end: number): Generator<Element> {
  let offset = start;
  while (offset < end) {
    const element = parseElementHeader(buffer, offset, offset);
    if (!Number.isFinite(element.end) || element.end > end) return;
    yield element;
    offset = element.end;
  }
}

function readUnsigned(buffer: Buffer, element: Element): number {
  let value = 0;
  for (let offset = element.bodyStart; offset < element.end; offset++) value = value * 256 + buffer[offset];
  return value;
}

async function readElementAt(file: FileHandle, offset: number): Promise<Element> {
  const header = Buffer.alloc(ELEMENT_HEADER_MAX_BYTES);
  await file.read(header, 0, ELEMENT_HEADER_MAX_BYTES, offset);
  return parseElementHeader(header, 0, offset);
}

async function readElementBody(file: FileHandle, element: Element): Promise<Buffer> {
  const length = element.end - element.bodyStart;
  if (!Number.isFinite(length) || length > ELEMENT_BODY_MAX_BYTES) throw new Error('Matroska element too large');
  const body = Buffer.alloc(length);
  await file.read(body, 0, length, element.bodyStart);
  return body;
}

function readTimestampScale(info: Buffer): number {
  for (const element of childElements(info, 0, info.length)) {
    if (element.id === ELEMENT_ID.timestampScale) return readUnsigned(info, element);
  }
  return DEFAULT_TIMESTAMP_SCALE_NS;
}

/** SeekPosition is relative to the Segment body. */
function readCuesPosition(seekHead: Buffer): number | undefined {
  for (const seek of childElements(seekHead, 0, seekHead.length)) {
    if (seek.id !== ELEMENT_ID.seek) continue;
    let targetId: number | undefined;
    let position: number | undefined;
    for (const field of childElements(seekHead, seek.bodyStart, seek.end)) {
      if (field.id === ELEMENT_ID.seekId) targetId = readUnsigned(seekHead, field);
      if (field.id === ELEMENT_ID.seekPosition) position = readUnsigned(seekHead, field);
    }
    if (targetId === ELEMENT_ID.cues) return position;
  }
  return undefined;
}

function readCueTimes(cues: Buffer, timestampScaleNs: number): number[] {
  const times: number[] = [];
  for (const cuePoint of childElements(cues, 0, cues.length)) {
    if (cuePoint.id !== ELEMENT_ID.cuePoint) continue;
    for (const field of childElements(cues, cuePoint.bodyStart, cuePoint.end)) {
      if (field.id === ELEMENT_ID.cueTime) times.push((readUnsigned(cues, field) * timestampScaleNs) / NS_PER_SEC);
    }
  }
  return times.sort((left, right) => left - right);
}

/**
 * Keyframe times from the Cues index, which muxers write for video keyframes.
 * Empty when the file has no Cues (live recordings), since finding keyframes would mean reading every cluster.
 */
export async function readMatroskaKeyframeTimes(file: FileHandle, fileSize: number): Promise<number[]> {
  const ebmlHeader = await readElementAt(file, 0);
  if (ebmlHeader.id !== ELEMENT_ID.ebml) return [];
  const segment = await readElementAt(file, ebmlHeader.end);
  if (segment.id !== ELEMENT_ID.segment) return [];
  const segmentEnd = Math.min(segment.end, fileSize);

  let timestampScaleNs = DEFAULT_TIMESTAMP_SCALE_NS;
  let cuesOffset: number | undefined;
  let offset = segment.bodyStart;
  while (offset < segmentEnd) {
    const element = await readElementAt(file, offset);
    if (element.id === ELEMENT_ID.info) timestampScaleNs = readTimestampScale(await readElementBody(file, element));
    if (element.id === ELEMENT_ID.seekHead && cuesOffset === undefined) {
      const position = readCuesPosition(await readElementBody(file, element));
      if (position !== undefined) cuesOffset = segment.bodyStart + position;
    }
    if (element.id === ELEMENT_ID.cues) return readCueTimes(await readElementBody(file, element), timestampScaleNs);
    // Info precedes the clusters, so jumping past them to the Cues loses nothing we still need.
    if (element.id === ELEMENT_ID.cluster) {
      if (cuesOffset === undefined || cuesOffset <= offset) return [];
      offset = cuesOffset;
      continue;
    }
    if (!Number.isFinite(element.end)) return [];
    offset = element.end;
  }
  return [];
}
