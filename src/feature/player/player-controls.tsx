import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../shared/lib/cn';
import { formatDuration } from '../../shared/lib/format';
import { Button, IconButton } from '../../shared/ui/button';
import { RangeSlider } from '../../shared/ui/range-slider';
import { useMessage } from '../setting/use-message';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
}

export interface PlayerCommands {
  togglePlay: () => void;
  seekTo: (timeSec: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  cyclePlaybackRate: () => void;
  toggleFullscreen: () => void;
  playPrevious?: () => void;
  playNext?: () => void;
}

/** Disabled when there is no command to run (e.g. no previous video). */
function ControlButton({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <IconButton tone="media" size="lg" label={label} onClick={onClick} disabled={!onClick}>
      {children}
    </IconButton>
  );
}

function VolumeIcon({ volume, isMuted }: { volume: number; isMuted: boolean }) {
  if (isMuted || volume === 0) return <VolumeX />;
  return volume < 0.5 ? <Volume1 /> : <Volume2 />;
}

// NOTE: Clicked controls must not keep focus, or Space/arrow shortcuts would be swallowed by them.
function releaseFocus() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

interface PlayerControlsProps {
  state: PlaybackState;
  commands: PlayerCommands;
  isVisible: boolean;
}

export function PlayerControls({ state, commands, isVisible }: PlayerControlsProps) {
  const message = useMessage().player;
  const playLabel = state.isPlaying ? message.pause : message.play;

  return (
    <div
      onPointerUp={releaseFocus}
      className={cn(
        'absolute inset-x-4 bottom-4 flex h-13 items-center gap-1 rounded-full bg-black/45 px-2.5 text-white shadow-overlay ring-1 ring-white/10 backdrop-blur-xl transition-opacity duration-(--duration-medium)',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <ControlButton label={message.previous} onClick={commands.playPrevious}><SkipBack className="fill-current" /></ControlButton>
      <ControlButton label={playLabel} onClick={commands.togglePlay}>
        {state.isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
      </ControlButton>
      <ControlButton label={message.next} onClick={commands.playNext}><SkipForward className="fill-current" /></ControlButton>
      <div className="group/volume flex items-center">
        <ControlButton label={state.isMuted ? message.unmute : message.mute} onClick={commands.toggleMute}>
          <VolumeIcon volume={state.volume} isMuted={state.isMuted} />
        </ControlButton>
        <RangeSlider
          label={message.volume}
          value={state.isMuted ? 0 : state.volume}
          max={1}
          onValueChange={commands.setVolume}
          className="w-0 opacity-0 transition-[width,opacity,margin] duration-(--duration-medium) group-hover/volume:mx-1.5 group-hover/volume:w-20 group-hover/volume:opacity-100 focus-visible:mx-1.5 focus-visible:w-20 focus-visible:opacity-100"
        />
      </div>

      <span className="ml-2 min-w-10 text-control font-medium tabular-nums">{formatDuration(state.currentTime)}</span>
      <RangeSlider
        label={message.progress}
        value={state.currentTime}
        max={state.duration}
        step={0.1}
        onValueChange={commands.seekTo}
        className="mx-3 min-w-0 flex-1"
      />
      <span className="mr-2 min-w-10 text-right text-control font-medium tabular-nums text-white/75">
        -{formatDuration(state.duration - state.currentTime)}
      </span>

      <Button
        tone="media"
        size="sm"
        title={message.playbackRate}
        aria-label={`${message.playbackRate} ${state.playbackRate}x`}
        onClick={commands.cyclePlaybackRate}
        layoutClassName="min-w-11 tabular-nums"
      >
        {state.playbackRate}x
      </Button>
      <ControlButton label={state.isFullscreen ? message.exitFullscreen : message.enterFullscreen} onClick={commands.toggleFullscreen}>
        {state.isFullscreen ? <Minimize /> : <Maximize />}
      </ControlButton>
    </div>
  );
}
