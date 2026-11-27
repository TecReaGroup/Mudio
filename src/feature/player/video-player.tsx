import { CircleAlert, FastForward, Rewind } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { describeError, log } from '../../shared/lib/logger';
import { BrandMark } from '../../shared/ui/brand-mark';
import { MEDIA_GLASS_CLASS } from '../../shared/ui/control-class';
import { Spinner } from '../../shared/ui/feedback';
import { useSetting } from '../setting/setting-context';
import { useVideoSource } from '../video-engine/use-video-source';
import { useMessage } from '../setting/use-message';
import { PlayerControls, type PlaybackState, type PlayerCommands } from './player-controls';
import { PlayerTopBar, type FrameSize } from './player-top-bar';
import { useAutoHideControls } from './use-auto-hide-controls';
import { useCoalescedSeek } from './use-coalesced-seek';
import { useDelayedFlag } from './use-delayed-flag';
import { useKeyframeSnap } from './use-keyframe-snap';
import { usePlaybackProgress } from './use-playback-progress';
import { PRESS_HOLD_RATE, useVideoPressGesture } from './use-video-press-gesture';

const SEEK_STEP_SEC = 5;
const VOLUME_STEP = 0.1;
const VOLUME_PRECISION = 100;
// Short stalls resolve on their own; only show the spinner when waiting is noticeable.
const BUFFERING_INDICATOR_DELAY_MS = 400;
// Kept across videos (the player remounts per video) for the lifetime of the window.
const sessionAudio = { volume: 1, isMuted: false };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface VideoPlayerProps {
  video: VideoEntry;
  /** Native `autoPlay`, read once per mount since the player is keyed by video. */
  autoPlay: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  /** Native `loop`: the video restarts at its end and `onEnded` never fires. */
  loop: boolean;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
  layoutClassName?: string;
}

/** Must be keyed by video id: each mount plays exactly one video. */
export function VideoPlayer({ video, autoPlay, onPrevious, onNext, loop, onEnded, onPlay, onPause, layoutClassName }: VideoPlayerProps) {
  const { setting } = useSetting();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: sessionAudio.volume,
    isMuted: sessionAudio.isMuted,
    playbackRate: 1,
    isFullscreen: false,
  });
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [frameSize, setFrameSize] = useState<FrameSize | undefined>(undefined);
  // Where the pointer is during a scrub, undefined otherwise. A ref, because the first change can arrive before the re-render.
  const scrubTargetSec = useRef<number | undefined>(undefined);
  const seekLatest = useCoalescedSeek(videoRef);
  const snapToKeyframe = useKeyframeSnap(video.id);
  const resumeFromSec = usePlaybackProgress(videoRef, video, setting.resumePlayback);
  const source = useVideoSource(videoRef, video.id, resumeFromSec);
  const hasFailed = hasPlaybackError || source.transcodeFailure !== undefined;
  const isBufferingIndicatorShown = useDelayedFlag(isBuffering && !hasFailed, BUFFERING_INDICATOR_DELAY_MS);
  const message = useMessage().player;
  const failureHint = source.transcodeFailure ? message.transcodeFailureHint[source.transcodeFailure] : message.playbackErrorHint;
  const { areControlsVisible, revealControls, trackPointer, concealControls } = useAutoHideControls(state.isPlaying, videoRef);

  const updateState = (patch: Partial<PlaybackState>) => setState(current => ({ ...current, ...patch }));
  const togglePlay = () => {
    const element = videoRef.current!;
    if (element.paused) element.play().catch(error => log('warn', 'Player', `Play rejected: ${describeError(error)}`));
    else element.pause();
  };
  const { pressHold, pressHandlers } = useVideoPressGesture(videoRef, {
    onTap: togglePlay,
    onSkipForward: () => {
      commands.seekTo(videoRef.current!.currentTime + SEEK_STEP_SEC);
      revealControls();
    },
  });
  // Hand tremor during a hold is a stream of tiny moves; without this the controls would flicker over the video.
  const isChromeShown = areControlsVisible && !pressHold;

  useEffect(() => {
    const element = videoRef.current!;
    element.volume = state.volume;
    // Rewinding is a stream of seeks, which would only produce audio chirps.
    element.muted = state.isMuted || pressHold === 'rewind';
    // Rate 0 freezes playback while scrubbing without firing pause/play, so the play state never flickers.
    // The hold is transient: the chosen rate in state is untouched and returns on release.
    element.playbackRate = isScrubbing ? 0 : pressHold === 'fast-forward' ? PRESS_HOLD_RATE : state.playbackRate;
    sessionAudio.volume = state.volume;
    sessionAudio.isMuted = state.isMuted;
  }, [state.volume, state.isMuted, state.playbackRate, pressHold, isScrubbing]);

  useEffect(() => {
    const syncFullscreen = () => updateState({ isFullscreen: document.fullscreenElement === containerRef.current });
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const commands: PlayerCommands = {
    togglePlay,
    seekTo: timeSec => {
      const durationSec = videoRef.current!.duration || 0;
      const targetSec = clamp(timeSec, 0, durationSec);
      if (scrubTargetSec.current === undefined) {
        seekLatest(targetSec);
      } else {
        scrubTargetSec.current = targetSec;
        // A transcoded seek outside the buffer restarts ffmpeg either way; snapping would only make the release seek
        // land elsewhere and restart it a second time.
        seekLatest(source.isTranscoded ? targetSec : Math.min(snapToKeyframe(targetSec), durationSec));
      }
      updateState({ currentTime: targetSec });
    },
    beginScrub: () => {
      scrubTargetSec.current = videoRef.current!.currentTime;
      setIsScrubbing(true);
    },
    // The preview showed the nearby keyframe; playback resumes from exactly where the pointer let go.
    endScrub: () => {
      seekLatest(scrubTargetSec.current!);
      scrubTargetSec.current = undefined;
      setIsScrubbing(false);
    },
    setVolume: requestedVolume => {
      // Snap away float drift from repeated ±VOLUME_STEP, so stepping down lands exactly on 0 and mutes.
      const volume = clamp(Math.round(requestedVolume * VOLUME_PRECISION) / VOLUME_PRECISION, 0, 1);
      updateState({ volume, isMuted: volume === 0 });
    },
    toggleMute: () => setState(current => ({ ...current, isMuted: !current.isMuted })),
    setPlaybackRate: playbackRate => updateState({ playbackRate }),
    toggleFullscreen: () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void containerRef.current!.requestFullscreen();
    },
    playPrevious: onPrevious,
    playNext: onNext,
  };

  // Re-bound every render so shortcuts always see the latest commands and state.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const element = videoRef.current!;
      const shortcuts: Record<string, () => void> = {
        ' ': commands.togglePlay,
        k: commands.togglePlay,
        ArrowLeft: () => commands.seekTo(element.currentTime - SEEK_STEP_SEC),
        ArrowUp: () => commands.setVolume(state.volume + VOLUME_STEP),
        ArrowDown: () => commands.setVolume(state.volume - VOLUME_STEP),
        f: commands.toggleFullscreen,
        m: commands.toggleMute,
      };
      const runShortcut = shortcuts[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (!runShortcut) return;
      event.preventDefault();
      runShortcut();
      revealControls();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div
      ref={containerRef}
      onMouseMove={trackPointer}
      onPointerEnter={trackPointer}
      onPointerLeave={concealControls}
      className={cn(
        // The caller sizes the stage; object-contain letterboxes any aspect ratio inside it.
        'relative overflow-hidden bg-canvas',
        layoutClassName,
        !isChromeShown && 'cursor-none',
      )}
    >
      <video
        ref={videoRef}
        src={source.url}
        autoPlay={autoPlay}
        loop={loop}
        className="size-full object-contain"
        {...pressHandlers}
        onDoubleClick={commands.toggleFullscreen}
        onPlay={() => {
          updateState({ isPlaying: true });
          onPlay();
        }}
        onPause={() => {
          updateState({ isPlaying: false });
          onPause();
        }}
        // Every seek waits for its frame to decode; the previous frame stays on screen meanwhile, so only real stalls count.
        onWaiting={event => {
          if (!event.currentTarget.seeking) setIsBuffering(true);
        }}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        // At playbackRate 0 a landed seek may never reach canplay/playing, which would leave the spinner stuck.
        onSeeked={() => setIsBuffering(false)}
        // While scrubbing the thumb follows the pointer; landed seeks lag behind it and would make it jump back.
        onTimeUpdate={event => {
          if (!isScrubbing) updateState({ currentTime: event.currentTarget.currentTime });
        }}
        // Audio-only files report 0×0; they have no resolution to show.
        onLoadedMetadata={event => {
          const { videoWidth: width, videoHeight: height } = event.currentTarget;
          setFrameSize(width > 0 && height > 0 ? { width, height } : undefined);
        }}
        onDurationChange={event => updateState({ duration: Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0 })}
        onEnded={onEnded}
        onError={event => {
          if (source.recoverFromError(event.currentTarget.error)) return;
          setHasPlaybackError(true);
          log('warn', 'Player', `Cannot play video ${video.id}: media error code ${event.currentTarget.error?.code ?? 'unknown'}`);
        }}
      />
      {isBufferingIndicatorShown && (
        <div role="status" className="pointer-events-none absolute inset-0 flex animate-overlay-in flex-col items-center justify-center gap-2 text-white/85">
          <Spinner layoutClassName="size-8" />
          <span className="text-meta">{message.loading}</span>
        </div>
      )}
      {hasFailed && (
        <div role="alert" className="absolute inset-0 flex animate-fade-in flex-col items-center justify-center gap-2 px-6 text-center text-white/85">
          <CircleAlert aria-hidden className="size-8" strokeWidth={1.5} />
          <p className="text-body">{message.playbackError}</p>
          <p className="text-meta text-white/55">{failureHint}</p>
        </div>
      )}
      {pressHold && (
        <div role="status" className={cn('pointer-events-none absolute left-1/2 top-20 flex -translate-x-1/2 animate-pop-in items-center gap-1.5 rounded-full px-3 py-1.5 text-control font-medium tabular-nums', MEDIA_GLASS_CLASS)}>
          {pressHold === 'rewind' ? <Rewind aria-hidden className="size-4 fill-current" /> : <FastForward aria-hidden className="size-4 fill-current" />}
          {PRESS_HOLD_RATE}x
        </div>
      )}
      <PlayerTopBar video={video} frameSize={frameSize} isVisible={isChromeShown} />
      <PlayerControls state={state} commands={commands} isVisible={isChromeShown} />
      {/* Paused-only mark, after the controls so it paints above their scrim. Pinned above the progress line's end; it only fades, never shifts. */}
      <BrandMark
        layoutClassName={cn(
          'pointer-events-none absolute bottom-20 right-10 h-15 text-foreground drop-shadow-[0_1px_8px_rgb(0_0_0/0.45)] transition-opacity duration-long',
          state.isPlaying ? 'opacity-0' : 'opacity-100',
        )}
      />
    </div>
  );
}
