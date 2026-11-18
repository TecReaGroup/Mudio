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
        'absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/45 to-transparent px-5 pb-3 pt-20 text-white transition-opacity duration-(--duration-medium)',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <RangeSlider
        label={message.progress}
        value={state.currentTime}
        max={state.duration}
        step={0.1}
        onValueChange={commands.seekTo}
        className="block w-full"
      />
      <div className="mt-2 flex h-10 items-center">
        <div className="flex items-center gap-1">
          <ControlButton label={message.previous} onClick={commands.playPrevious}><SkipBack className="fill-current" /></ControlButton>
          <IconButton tone="mediaPrimary" size="xl" label={playLabel} onClick={commands.togglePlay} layoutClassName="mx-1">
            {state.isPlaying ? <Pause className="fill-current" /> : <Play className="ml-0.5 fill-current" />}
          </IconButton>
          <ControlButton label={message.next} onClick={commands.playNext}><SkipForward className="fill-current" /></ControlButton>
        </div>
        <span className="ml-4 text-control font-medium tabular-nums">
          {formatDuration(state.currentTime)}
          <span className="text-white/55"> / {formatDuration(state.duration)}</span>
        </span>

        <div className="ml-auto flex items-center gap-1">
          <div className="flex items-center gap-1 pr-2">
            <ControlButton label={state.isMuted ? message.unmute : message.mute} onClick={commands.toggleMute}>
              <VolumeIcon volume={state.volume} isMuted={state.isMuted} />
            </ControlButton>
            <RangeSlider
              label={message.volume}
              value={state.isMuted ? 0 : state.volume}
              max={1}
              onValueChange={commands.setVolume}
              className="w-24"
            />
          </div>
          <Button
            tone="media"
            size="sm"
            title={message.playbackRate}
            aria-label={`${message.playbackRate} ${state.playbackRate}x`}
            onClick={commands.cyclePlaybackRate}
            layoutClassName="min-w-12 tabular-nums"
          >
            {state.playbackRate}x
          </Button>
          <ControlButton label={state.isFullscreen ? message.exitFullscreen : message.enterFullscreen} onClick={commands.toggleFullscreen}>
            {state.isFullscreen ? <Minimize /> : <Maximize />}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
