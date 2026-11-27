import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import { app } from 'electron';
import { TRANSCODE_RESPONSE } from '../../src/shared/contract/mudio-contract';
import { describeError, log } from '../log/logger';

// Not bundled: only the system's ffmpeg on PATH is used, and only for codecs Chromium cannot play.
const FFMPEG_COMMAND = 'ffmpeg';
// Tried in order; the first that encodes a test frame on this machine wins.
const HARDWARE_H264_ENCODERS = ['h264_nvenc', 'h264_qsv', 'h264_amf', 'h264_mf', 'h264_videotoolbox'];
const SOFTWARE_H264_ENCODER = 'libx264';
// Speed over compression: the output only travels over a local pipe.
const ENCODER_SPEED_ARGS: Record<string, string[]> = {
  h264_nvenc: ['-preset', 'p2'],
  h264_qsv: ['-preset', 'veryfast'],
  h264_amf: ['-quality', 'speed'],
  // Without this h264_mf may silently pick Windows' software MFT.
  h264_mf: ['-hw_encoding', '1'],
  h264_videotoolbox: ['-realtime', '1'],
  libx264: ['-preset', 'veryfast'],
};
const VIDEO_BITRATE = '10M';
const AUDIO_BITRATE = '160k';
// Every encoder takes NV12, so frames pulled back from a hardware decoder need no extra conversion.
const ENCODER_PIXEL_FORMAT = 'nv12';
const KEYFRAME_INTERVAL_SEC = 2;
// Short fragments let playback start within a second of a seek instead of waiting for a whole GOP.
const FRAGMENT_DURATION_US = 1_000_000;
const STDERR_TAIL_CHARS = 2_000;
// Matches the renderer's own poster capture, so both kinds of thumbnail look alike.
const POSTER_WIDTH = 480;
// mjpeg quality scale, 2 (best) to 31 (worst).
const POSTER_JPEG_QSCALE = 4;
// "Duration: 01:02:03.45" in ffmpeg's input summary.
const DURATION_PATTERN = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/;
// Input stream lines such as "Stream #0:1[0x2](und): Audio: pcm_alaw".
const AUDIO_STREAM_PATTERN = /Stream #\d+:\d+\S*: Audio:/;
// The renderer fetches cross-origin and must read the status and custom headers, failures included.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': `${TRANSCODE_RESPONSE.durationHeader}, ${TRANSCODE_RESPONSE.hasAudioHeader}`,
};

type FfmpegProcess = ChildProcessByStdio<null, Readable, Readable>;

interface MediaProbe {
  durationSec: number;
  hasAudio: boolean;
}

interface TranscodeAttempt {
  label: string;
  decodeArgs: string[];
  encoder: string;
}

/** The attempt's ffmpeg was killed for a newer seek of the same file; its request is already abandoned. */
class TranscodeSupersededError extends Error {}

let attempts: Promise<TranscodeAttempt[]> | undefined;
const probeByFile = new Map<string, Promise<MediaProbe>>();
/** Files whose hardware attempt failed start straight at the attempt that worked, instead of failing every seek. */
const firstAttemptByFile = new Map<string, number>();
/** One live transcode per file: a seek replaces it, so an abandoned stream never keeps ffmpeg running. */
const runningByFile = new Map<string, FfmpegProcess>();

// Windows does not end child processes with their parent; a running ffmpeg would linger after quit.
app.on('will-quit', () => {
  for (const child of runningByFile.values()) child.kill();
});

function isFfmpegMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

function spawnFfmpeg(args: string[]): FfmpegProcess {
  return spawn(FFMPEG_COMMAND, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
}

/** Runs ffmpeg to completion; a non-zero exit code is reported, not thrown, since some queries end that way by design. */
function runFfmpeg(args: string[]): Promise<{ exitCode: number | null; stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawnFfmpeg(args);
    const stdoutChunks: Buffer[] = [];
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.setEncoding('utf8').on('data', (text: string) => {
      stderr += text;
    });
    child.once('error', reject);
    child.once('close', exitCode => resolve({ exitCode, stdout: Buffer.concat(stdoutChunks), stderr }));
  });
}

/** Remembered per file, failures excepted: every seek restarts the transcode and needs the same answer. */
function probeMedia(filePath: string): Promise<MediaProbe> {
  let probe = probeByFile.get(filePath);
  if (!probe) {
    probe = readMediaProbe(filePath);
    probeByFile.set(filePath, probe);
    probe.catch(() => probeByFile.delete(filePath));
  }
  return probe;
}

async function readMediaProbe(filePath: string): Promise<MediaProbe> {
  // Given no output, ffmpeg prints the input summary and exits with an error; that summary is all we need, and it
  // spares requiring ffprobe as well.
  const { stderr } = await runFfmpeg(['-hide_banner', '-nostdin', '-i', filePath]);
  const duration = DURATION_PATTERN.exec(stderr);
  if (!duration) throw new Error(`ffmpeg reported no duration: ${stderr.trim().split('\n').at(-1)}`);
  const [, hours, minutes, seconds] = duration;
  return {
    durationSec: Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds),
    hasAudio: AUDIO_STREAM_PATTERN.test(stderr),
  };
}

async function encodesTestFrame(encoder: string): Promise<boolean> {
  const { exitCode } = await runFfmpeg([
    '-hide_banner', '-loglevel', 'error', '-nostdin',
    '-f', 'lavfi', '-i', 'color=size=1280x720:rate=30:duration=0.2',
    '-pix_fmt', ENCODER_PIXEL_FORMAT, '-c:v', encoder, '-f', 'null', '-',
  ]);
  return exitCode === 0;
}

/** Tests every encoder at once, since each test is mostly ffmpeg and driver startup; keeps the list's preference order. */
async function firstWorkingEncoder(encoders: string[]): Promise<string | undefined> {
  const works = await Promise.all(encoders.map(encodesTestFrame));
  return encoders.find((_encoder, index) => works[index]);
}

/** Hardware first; the software attempt is what remains when the GPU path fails for a file. */
async function detectAttempts(): Promise<TranscodeAttempt[]> {
  const [hardwareEncoder, softwareEncoder] = await Promise.all([
    firstWorkingEncoder(HARDWARE_H264_ENCODERS),
    firstWorkingEncoder([SOFTWARE_H264_ENCODER]),
  ]);
  const preferredEncoder = hardwareEncoder ?? softwareEncoder;
  const fallbackEncoder = softwareEncoder ?? hardwareEncoder;
  if (!preferredEncoder || !fallbackEncoder) throw new Error('The system ffmpeg has no usable H.264 encoder');
  const detected = [
    { label: `hardware decode + ${preferredEncoder}`, decodeArgs: ['-hwaccel', 'auto'], encoder: preferredEncoder },
    { label: `software decode + ${fallbackEncoder}`, decodeArgs: [], encoder: fallbackEncoder },
  ];
  log('info', 'Transcode', `Attempts: ${detected.map(attempt => attempt.label).join(' -> ')}`);
  return detected;
}

function loadAttempts(): Promise<TranscodeAttempt[]> {
  // A failed detection (ffmpeg missing) is retried next time, so installing ffmpeg needs no restart.
  attempts ??= detectAttempts().catch(error => {
    attempts = undefined;
    throw error;
  });
  return attempts;
}

function transcodeArgs(filePath: string, startSec: number, attempt: TranscodeAttempt): string[] {
  const start = startSec.toFixed(3);
  return [
    '-hide_banner', '-loglevel', 'error', '-nostdin',
    ...attempt.decodeArgs,
    '-ss', start, '-i', filePath,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-c:v', attempt.encoder, ...ENCODER_SPEED_ARGS[attempt.encoder],
    '-pix_fmt', ENCODER_PIXEL_FORMAT, '-b:v', VIDEO_BITRATE,
    '-force_key_frames', `expr:gte(t,n_forced*${KEYFRAME_INTERVAL_SEC})`,
    // No reordering: frames leave the encoder at once, and the first frame's presentation time is exactly the start.
    '-bf', '0',
    '-c:a', 'aac', '-ac', '2', '-b:a', AUDIO_BITRATE,
    '-f', 'mp4', '-movflags', 'empty_moov+default_base_moof+frag_keyframe', '-frag_duration', String(FRAGMENT_DURATION_US),
    'pipe:1',
  ];
}

function spawnReplacing(filePath: string, args: string[]): FfmpegProcess {
  runningByFile.get(filePath)?.kill();
  const child = spawnFfmpeg(args);
  runningByFile.set(filePath, child);
  // An unheard 'error' event would crash the main process.
  child.on('error', error => log('warn', 'Transcode', `ffmpeg process error: ${describeError(error)}`));
  child.once('close', () => {
    if (runningByFile.get(filePath) === child) runningByFile.delete(filePath);
  });
  return child;
}

function collectStderrTail(child: FfmpegProcess): () => string {
  let tail = '';
  child.stderr.setEncoding('utf8').on('data', (text: string) => {
    tail = (tail + text).slice(-STDERR_TAIL_CHARS);
  });
  return () => tail.trim();
}

/** Resolves once ffmpeg has written output; a process that dies first failed to set up its decoder or encoder. */
function awaitFirstOutput(child: FfmpegProcess, stderrTail: () => string): Promise<void> {
  return new Promise((resolve, reject) => {
    const settle = (error?: Error) => {
      child.stdout.off('readable', onReadable);
      child.off('close', onClose);
      child.off('error', settle);
      if (error) reject(error);
      else resolve();
    };
    const onReadable = () => {
      if (child.stdout.readableLength > 0) settle();
    };
    const onClose = (exitCode: number | null) => settle(new Error(`ffmpeg exited with code ${exitCode} before any output: ${stderrTail()}`));
    child.stdout.on('readable', onReadable);
    child.once('close', onClose);
    child.once('error', settle);
  });
}

/**
 * ffmpeg's stdout, ending cleanly only when ffmpeg exited cleanly. The player declares end of stream on a clean end,
 * which truncates the media duration to what was buffered, so a crashed transcode must surface as an error instead.
 */
function outputStream(child: FfmpegProcess, stderrTail: () => string): ReadableStream<Uint8Array> {
  const { stdout } = child;
  let isCancelled = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stdout.on('data', (chunk: Buffer) => {
        // ffmpeg may still flush output between the cancel and its death; enqueueing then would throw.
        if (isCancelled) return;
        controller.enqueue(chunk);
        // Pausing lets the pipe fill, so ffmpeg blocks instead of encoding ahead of the player.
        if (controller.desiredSize! <= 0) stdout.pause();
      });
      child.once('close', (exitCode, signal) => {
        if (isCancelled) return;
        if (exitCode === 0) {
          controller.close();
          return;
        }
        log('warn', 'Transcode', `ffmpeg stopped mid-stream with code ${exitCode ?? signal}: ${stderrTail()}`);
        controller.error(new Error(`ffmpeg stopped mid-stream with code ${exitCode ?? signal}`));
      });
    },
    pull() {
      stdout.resume();
    },
    // The player seeked or closed; ffmpeg must not outlive the response.
    cancel() {
      isCancelled = true;
      child.kill();
    },
  });
}

async function streamTranscode(filePath: string, startSec: number): Promise<ReadableStream<Uint8Array>> {
  const detected = await loadAttempts();
  for (let index = firstAttemptByFile.get(filePath) ?? 0; index < detected.length; index++) {
    const attempt = detected[index];
    const spawnedAt = performance.now();
    const child = spawnReplacing(filePath, transcodeArgs(filePath, startSec, attempt));
    const stderrTail = collectStderrTail(child);
    try {
      await awaitFirstOutput(child, stderrTail);
    } catch (error) {
      // Falling back here would kill the newer seek's ffmpeg in turn, until every request in the burst fails.
      if (child.killed) throw new TranscodeSupersededError();
      log('warn', 'Transcode', `${attempt.label} failed: ${describeError(error)}`);
      continue;
    }
    firstAttemptByFile.set(filePath, index);
    log('info', 'Transcode', `Streaming from ${startSec.toFixed(1)}s with ${attempt.label}, first output after ${Math.round(performance.now() - spawnedAt)} ms`);
    return outputStream(child, stderrTail);
  }
  throw new Error('Every transcode attempt failed');
}

/**
 * Serves a file Chromium cannot decode as fragmented H.264/AAC MP4 starting at `startSec`, transcoded by the system's
 * ffmpeg with hardware first and software as the fallback. The status tells the renderer why it failed, if it did.
 */
export async function serveTranscode(filePath: string, startSec: number): Promise<Response> {
  if (!Number.isFinite(startSec) || startSec < 0) return new Response(null, { status: 400, headers: CORS_HEADERS });
  // Probing and starting the transcode are independent ffmpeg runs; overlapping them shortens every first open.
  const streaming = streamTranscode(filePath, startSec);
  // Its failure is awaited below, possibly only after the probe; an unheard rejection in between would crash the process.
  streaming.catch(() => undefined);
  try {
    const probe = await probeMedia(filePath).catch(async (error: unknown) => {
      await streaming.then(body => body.cancel(), () => undefined);
      throw error;
    });
    const body = await streaming;
    return new Response(body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
        [TRANSCODE_RESPONSE.durationHeader]: String(probe.durationSec),
        [TRANSCODE_RESPONSE.hasAudioHeader]: String(probe.hasAudio),
      },
    });
  } catch (error) {
    if (error instanceof TranscodeSupersededError) {
      log('debug', 'Transcode', `Transcode from ${startSec.toFixed(1)}s superseded by a newer seek`);
      return new Response(null, { status: 409, headers: CORS_HEADERS });
    }
    return failureResponse(error, `Cannot transcode ${filePath}`);
  }
}

/** The first video frame as a JPEG poster, for files the renderer cannot decode to capture one itself. */
export async function serveFirstFrame(filePath: string): Promise<Response> {
  try {
    const probe = await probeMedia(filePath);
    const { exitCode, stdout, stderr } = await runFfmpeg([
      '-hide_banner', '-loglevel', 'error', '-nostdin',
      '-i', filePath, '-map', '0:v:0', '-frames:v', '1',
      '-vf', `scale=${POSTER_WIDTH}:-2`, '-q:v', String(POSTER_JPEG_QSCALE),
      '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1',
    ]);
    if (exitCode !== 0 || stdout.length === 0) throw new Error(`ffmpeg exited with code ${exitCode}: ${stderr.trim()}`);
    return new Response(new Uint8Array(stdout), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'image/jpeg', [TRANSCODE_RESPONSE.durationHeader]: String(probe.durationSec) },
    });
  } catch (error) {
    return failureResponse(error, `Cannot extract first frame of ${filePath}`);
  }
}

function failureResponse(error: unknown, context: string): Response {
  if (isFfmpegMissing(error)) {
    log('warn', 'Transcode', 'ffmpeg is not on PATH; unsupported codecs cannot be played');
    return new Response(null, { status: TRANSCODE_RESPONSE.ffmpegMissingStatus, headers: CORS_HEADERS });
  }
  log('error', 'Transcode', `${context}: ${describeError(error)}`);
  return new Response(null, { status: 500, headers: CORS_HEADERS });
}
