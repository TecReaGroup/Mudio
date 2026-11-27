import type { FileHandle } from 'node:fs/promises';

// A moov this large means a broken file; refusing it keeps one bad video from exhausting memory.
const MOOV_MAX_BYTES = 64 * 1024 * 1024;
const BOX_HEADER_PROBE_BYTES = 16;
const EMPTY_EDIT_MEDIA_TIME = -1;

interface Box {
  type: string;
  bodyStart: number;
  end: number;
}

async function readTopLevelBox(file: FileHandle, offset: number, fileSize: number): Promise<Box> {
  const header = Buffer.alloc(BOX_HEADER_PROBE_BYTES);
  await file.read(header, 0, BOX_HEADER_PROBE_BYTES, offset);
  const type = header.toString('latin1', 4, 8);
  const size32 = header.readUInt32BE(0);
  if (size32 === 1) return { type, bodyStart: offset + 16, end: offset + Number(header.readBigUInt64BE(8)) };
  // Size 0 means the box runs to the end of the file.
  return { type, bodyStart: offset + 8, end: size32 === 0 ? fileSize : offset + size32 };
}

function* childBoxes(buffer: Buffer, start: number, end: number): Generator<Box> {
  let offset = start;
  while (offset + 8 <= end) {
    const size32 = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const box = size32 === 1
      ? { type, bodyStart: offset + 16, end: offset + Number(buffer.readBigUInt64BE(offset + 8)) }
      : { type, bodyStart: offset + 8, end: size32 === 0 ? end : offset + size32 };
    if (box.end <= offset || box.end > end) return;
    yield box;
    offset = box.end;
  }
}

function findChild(buffer: Buffer, parent: Box, type: string): Box | undefined {
  for (const box of childBoxes(buffer, parent.bodyStart, parent.end)) if (box.type === type) return box;
  return undefined;
}

function findPath(buffer: Buffer, root: Box, path: string[]): Box | undefined {
  let current: Box | undefined = root;
  for (const type of path) current = current && findChild(buffer, current, type);
  return current;
}

/** mvhd and mdhd share this layout: version byte, then timescale after the creation/modification times. */
function readTimescale(buffer: Buffer, box: Box): number {
  const version = buffer.readUInt8(box.bodyStart);
  return buffer.readUInt32BE(box.bodyStart + (version === 1 ? 20 : 12));
}

/** Run-length (count, value) pairs as stored in stts and ctts. */
function readRunTable(buffer: Buffer, box: Box, readValue: (offset: number) => number): Array<[number, number]> {
  const entryCount = buffer.readUInt32BE(box.bodyStart + 4);
  const runs: Array<[number, number]> = [];
  for (let index = 0; index < entryCount; index++) {
    const offset = box.bodyStart + 8 + index * 8;
    runs.push([buffer.readUInt32BE(offset), readValue(offset + 4)]);
  }
  return runs;
}

/** Looks up per-sample values in a run table for ascending sample numbers, in one pass. */
function createRunCursor(runs: Array<[number, number]>) {
  let runIndex = 0;
  let runFirstSample = 1;
  let accumulated = 0;
  return {
    /** Sum of the values of all samples before `sampleNumber` (the decode time, for stts). */
    sumBefore(sampleNumber: number): number {
      while (runIndex < runs.length && runFirstSample + runs[runIndex][0] <= sampleNumber) {
        accumulated += runs[runIndex][0] * runs[runIndex][1];
        runFirstSample += runs[runIndex][0];
        runIndex++;
      }
      return accumulated + (sampleNumber - runFirstSample) * (runs[runIndex]?.[1] ?? 0);
    },
    /** The value of `sampleNumber` itself (the composition offset, for ctts). */
    valueAt(sampleNumber: number): number {
      while (runIndex < runs.length && runFirstSample + runs[runIndex][0] <= sampleNumber) {
        runFirstSample += runs[runIndex][0];
        runIndex++;
      }
      return runs[runIndex]?.[1] ?? 0;
    },
  };
}

interface EditOffset {
  /** Leading empty edits delay the whole track, in seconds. */
  delaySec: number;
  /** Media time the first real edit starts at, in track timescale units. */
  mediaStart: number;
}

function readEditOffset(buffer: Buffer, trak: Box, movieTimescale: number): EditOffset {
  const elst = findPath(buffer, trak, ['edts', 'elst']);
  if (!elst) return { delaySec: 0, mediaStart: 0 };
  const version = buffer.readUInt8(elst.bodyStart);
  const entryCount = buffer.readUInt32BE(elst.bodyStart + 4);
  const entrySize = version === 1 ? 20 : 12;
  let delay = 0;
  for (let index = 0; index < entryCount; index++) {
    const offset = elst.bodyStart + 8 + index * entrySize;
    const segmentDuration = version === 1 ? Number(buffer.readBigUInt64BE(offset)) : buffer.readUInt32BE(offset);
    const mediaTime = version === 1 ? Number(buffer.readBigInt64BE(offset + 8)) : buffer.readInt32BE(offset + 4);
    if (mediaTime !== EMPTY_EDIT_MEDIA_TIME) return { delaySec: delay / movieTimescale, mediaStart: mediaTime };
    delay += segmentDuration;
  }
  return { delaySec: delay / movieTimescale, mediaStart: 0 };
}

function isVideoTrack(buffer: Buffer, trak: Box): boolean {
  const hdlr = findPath(buffer, trak, ['mdia', 'hdlr']);
  return hdlr !== undefined && buffer.toString('latin1', hdlr.bodyStart + 8, hdlr.bodyStart + 12) === 'vide';
}

function readVideoKeyframeTimes(buffer: Buffer, moov: Box): number[] {
  const movieTimescale = readTimescale(buffer, findChild(buffer, moov, 'mvhd')!);
  for (const trak of childBoxes(buffer, moov.bodyStart, moov.end)) {
    if (trak.type !== 'trak' || !isVideoTrack(buffer, trak)) continue;
    const stbl = findPath(buffer, trak, ['mdia', 'minf', 'stbl']);
    const mdhd = findPath(buffer, trak, ['mdia', 'mdhd']);
    const stss = stbl && findChild(buffer, stbl, 'stss');
    const stts = stbl && findChild(buffer, stbl, 'stts');
    // No stss means every sample is a sync sample: exact seeks are already cheap, nothing to snap to.
    if (!mdhd || !stss || !stts) return [];

    const timescale = readTimescale(buffer, mdhd);
    const { delaySec, mediaStart } = readEditOffset(buffer, trak, movieTimescale);
    const decodeTimes = createRunCursor(readRunTable(buffer, stts, offset => buffer.readUInt32BE(offset)));
    const ctts = findChild(buffer, stbl, 'ctts');
    // Signed even in version 0 in practice: encoders write negative offsets there too, and FFmpeg reads them that way.
    const compositionOffsets = ctts && createRunCursor(readRunTable(buffer, ctts, offset => buffer.readInt32BE(offset)));

    const keyframeCount = buffer.readUInt32BE(stss.bodyStart + 4);
    const times: number[] = [];
    for (let index = 0; index < keyframeCount; index++) {
      const sampleNumber = buffer.readUInt32BE(stss.bodyStart + 8 + index * 4);
      const presentation = decodeTimes.sumBefore(sampleNumber) + (compositionOffsets?.valueAt(sampleNumber) ?? 0) - mediaStart;
      times.push(Math.max(0, presentation / timescale + delaySec));
    }
    return times.sort((left, right) => left - right);
  }
  return [];
}

/** Presentation times of the first video track's sync samples; empty for fragmented or intra-only files. */
export async function readMp4KeyframeTimes(file: FileHandle, fileSize: number): Promise<number[]> {
  let offset = 0;
  while (offset + 8 <= fileSize) {
    const box = await readTopLevelBox(file, offset, fileSize);
    if (box.end <= offset) return [];
    if (box.type === 'moov') {
      const length = box.end - offset;
      if (length > MOOV_MAX_BYTES) return [];
      const buffer = Buffer.alloc(length);
      await file.read(buffer, 0, length, offset);
      return readVideoKeyframeTimes(buffer, { type: 'moov', bodyStart: box.bodyStart - offset, end: length });
    }
    offset = box.end;
  }
  return [];
}
