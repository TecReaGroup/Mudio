import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { videoSourceUrl } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { describeError, log } from '../../shared/lib/logger';
import { useSetting } from '../setting/setting-context';
import { PlayerControls, type PlaybackState, type PlayerCommands } from './player-controls';
import { useAutoHideControls } from './use-auto-hide-controls';
import { usePlaybackProgress } from './use-playback-progress';

const SEEK_STEP_SEC = 5;
const VOLUME_STEP = 0.1;
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
}

/** Must be keyed by video id: each mount plays exactly one video. */
export function VideoPlayer({ video, onPrevious, onNext, onEnded }: VideoPlayerProps) {
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
      className={cn('relative size-full overflow-hidden bg-black', !areControlsVisible && 'cursor-none')}
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
        onTimeUpdate={event => updateState({ currentTime: event.currentTarget.currentTime })}
        onDurationChange={event => updateState({ duration: Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0 })}
        onEnded={onEnded}
        onError={event => {
          setHasPlaybackError(true);
          log('warn', 'Player', `Cannot play video ${video.id}: media error code ${event.currentTarget.error?.code ?? 'unknown'}`);
        }}
      />
      {hasPlaybackError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-white/85">
          <CircleAlert className="size-8" strokeWidth={1.5} />
          <p className="text-sm">无法播放此视频</p>
          <p className="text-xs text-white/55">文件可能已被移动，或使用了不受支持的编码格式</p>
        </div>
      )}
      <PlayerControls state={state} commands={commands} isVisible={areControlsVisible} />
    </div>
  );
}
