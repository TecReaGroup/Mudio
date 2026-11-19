import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { videoSourceUrl } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { describeError, log } from '../../shared/lib/logger';
import { Spinner } from '../../shared/ui/feedback';
import { useSetting } from '../setting/setting-context';
import { useMessage } from '../setting/use-message';
import { PlayerControls, type PlaybackState, type PlayerCommands } from './player-controls';
import { PlayerTopBar } from './player-top-bar';
import { useAutoHideControls } from './use-auto-hide-controls';
import { useDelayedFlag } from './use-delayed-flag';
import { usePlaybackProgress } from './use-playback-progress';

const SEEK_STEP_SEC = 5;
const VOLUME_STEP = 0.1;
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
// Short stalls resolve on their own; only show the spinner when waiting is noticeable.
const BUFFERING_INDICATOR_DELAY_MS = 400;
// Kept across videos (the player remounts per video) for the lifetime of the window.
const sessionAudio = { volume: 1, isMuted: false };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface VideoPlayerProps {
  video: VideoEntry;
  onPrevious?: () => void;
  onNext?: () => void;
  onEnded: () => void;
  layoutClassName?: string;
}

/** Must be keyed by video id: each mount plays exactly one video. */
export function VideoPlayer({ video, onPrevious, onNext, onEnded, layoutClassName }: VideoPlayerProps) {
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
  const isBufferingIndicatorShown = useDelayedFlag(isBuffering && !hasPlaybackError, BUFFERING_INDICATOR_DELAY_MS);
  const message = useMessage().player;
  const { areControlsVisible, revealControls } = useAutoHideControls(state.isPlaying);
  usePlaybackProgress(videoRef, video, setting.resumePlayback);

  const updateState = (patch: Partial<PlaybackState>) => setState(current => ({ ...current, ...patch }));

  useEffect(() => {
    const element = videoRef.current!;
    element.volume = state.volume;
    element.muted = state.isMuted;
    element.playbackRate = state.playbackRate;
    sessionAudio.volume = state.volume;
    sessionAudio.isMuted = state.isMuted;
  }, [state.volume, state.isMuted, state.playbackRate]);

  useEffect(() => {
    const syncFullscreen = () => updateState({ isFullscreen: document.fullscreenElement === containerRef.current });
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const commands: PlayerCommands = {
    togglePlay: () => {
      const element = videoRef.current!;
      if (element.paused) element.play().catch(error => log('warn', 'Player', `Play rejected: ${describeError(error)}`));
      else element.pause();
    },
    seekTo: timeSec => {
      const element = videoRef.current!;
      element.currentTime = clamp(timeSec, 0, element.duration || 0);
      updateState({ currentTime: element.currentTime });
    },
    setVolume: volume => updateState({ volume: clamp(volume, 0, 1), isMuted: volume === 0 }),
    toggleMute: () => setState(current => ({ ...current, isMuted: !current.isMuted })),
    cyclePlaybackRate: () => setState(current => ({
      ...current,
      playbackRate: PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(current.playbackRate) + 1) % PLAYBACK_RATES.length],
    })),
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
        ArrowRight: () => commands.seekTo(element.currentTime + SEEK_STEP_SEC),
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
      onMouseMove={revealControls}
      className={cn(
        // The caller sizes the stage; object-contain letterboxes any aspect ratio inside it.
        'relative overflow-hidden bg-black',
        layoutClassName,
        !areControlsVisible && 'cursor-none',
      )}
    >
      <video
        ref={videoRef}
        src={videoSourceUrl(video.id)}
        autoPlay
        className="size-full object-contain"
        onClick={commands.togglePlay}
        onDoubleClick={commands.toggleFullscreen}
        onPlay={() => updateState({ isPlaying: true })}
        onPause={() => updateState({ isPlaying: false })}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onTimeUpdate={event => updateState({ currentTime: event.currentTarget.currentTime })}
        onDurationChange={event => updateState({ duration: Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0 })}
        onEnded={onEnded}
        onError={event => {
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
      {hasPlaybackError && (
        <div role="alert" className="absolute inset-0 flex animate-fade-in flex-col items-center justify-center gap-2 px-6 text-center text-white/85">
          <CircleAlert aria-hidden className="size-8" strokeWidth={1.5} />
          <p className="text-body">{message.playbackError}</p>
          <p className="text-meta text-white/55">{message.playbackErrorHint}</p>
        </div>
      )}
      <PlayerTopBar video={video} isVisible={areControlsVisible} />
      <PlayerControls state={state} commands={commands} isVisible={areControlsVisible} />
    </div>
  );
}
