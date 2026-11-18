import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { protocol } from 'electron';
import { MEDIA_HOST, MEDIA_SCHEME } from '../../src/shared/contract/mudio-contract';
import type { VideoLibrary } from '../library/video-library';
import { describeError, log } from '../log/logger';

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  // Chromium refuses video/quicktime, but plays H.264/AAC .mov files declared as mp4.
  '.mov': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.ogv': 'video/ogg',
  '.jpg': 'image/jpeg',
};

// Single range only: "bytes=start-end", "bytes=start-" or suffix "bytes=-length".
const BYTE_RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;

interface ByteRange {
  start: number;
  end: number;
}

type RangeRequest = { kind: 'whole' } | { kind: 'partial'; range: ByteRange } | { kind: 'unsatisfiable' };

function parseRangeHeader(header: string | null, size: number): RangeRequest {
  const match = header ? BYTE_RANGE_PATTERN.exec(header.trim()) : null;
  if (!match || (!match[1] && !match[2])) return { kind: 'whole' };
  const [, startText, endText] = match;
  if (!startText) {
    const suffixLength = Number(endText);
    if (suffixLength === 0) return { kind: 'unsatisfiable' };
    return { kind: 'partial', range: { start: Math.max(size - suffixLength, 0), end: size - 1 } };
  }
  const start = Number(startText);
  const end = endText ? Math.min(Number(endText), size - 1) : size - 1;
  if (start >= size || start > end) return { kind: 'unsatisfiable' };
  return { kind: 'partial', range: { start, end } };
}

/** Streams a file with HTTP Range support; <video> needs 206 responses to seek. */
async function serveFile(filePath: string, rangeHeader: string | null): Promise<Response> {
  const { size } = await stat(filePath);
  const headers: Record<string, string> = {
    'Content-Type': CONTENT_TYPE_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    // Poster capture draws video frames to a canvas, which requires CORS-clean media.
    'Access-Control-Allow-Origin': '*',
  };
  if (size === 0) return new Response(null, { status: 200, headers });

  const rangeRequest = parseRangeHeader(rangeHeader, size);
  if (rangeRequest.kind === 'unsatisfiable') {
    return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
  }
  const { start, end } = rangeRequest.kind === 'partial' ? rangeRequest.range : { start: 0, end: size - 1 };
  const body = Readable.toWeb(createReadStream(filePath, { start, end })) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, {
    status: rangeRequest.kind === 'partial' ? 206 : 200,
    headers: {
      ...headers,
      'Content-Length': String(end - start + 1),
      ...(rangeRequest.kind === 'partial' ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}

/** Must run before app "ready". */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([{
    scheme: MEDIA_SCHEME,
    privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true },
  }]);
}

/** Serves only library entries by id, so the renderer can never read arbitrary paths. */
export function handleMediaProtocol(library: VideoLibrary): void {
  protocol.handle(MEDIA_SCHEME, async request => {
    const { host, pathname } = new URL(request.url);
    const video = library.find(pathname.slice(1));
    const filePath = host === MEDIA_HOST.video ? video?.filePath
      : host === MEDIA_HOST.thumbnail && video?.hasThumbnail ? library.thumbnailPath(video.id)
        : undefined;
    if (!video || !filePath) return new Response(null, { status: 404 });

    try {
      return await serveFile(filePath, request.headers.get('range'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        log('warn', 'Media', `File missing for ${host} ${video.id}`);
        return new Response(null, { status: 404 });
      }
      log('error', 'Media', `Failed to serve ${host} ${video.id}: ${describeError(error)}`);
      return new Response(null, { status: 500 });
    }
  });
}
