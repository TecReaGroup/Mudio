import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../shared/lib/cn';
import { formatDuration } from '../../shared/lib/format';
import { Button, IconButton } from '../../shared/ui/button';
import { RangeSlider } from '../../shared/ui/range-slider';
import { useMessage } from '../setting/use-message';
import { ControlPopover } from './control-popover';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
  setPlaybackRate: (playbackRate: number) => void;
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

function VolumeControl({ state, commands }: { state: PlaybackState; commands: PlayerCommands }) {
  const message = useMessage().player;
  const effectiveVolume = state.isMuted ? 0 : state.volume;
  return (
    <ControlPopover
      trigger={(
        <ControlButton label={state.isMuted ? message.unmute : message.mute} onClick={commands.toggleMute}>
          <VolumeIcon volume={state.volume} isMuted={state.isMuted} />
        </ControlButton>
      )}
    >
      <div className="flex w-9 flex-col items-center gap-1.5 py-1">
        <span className="text-meta font-medium tabular-nums">{Math.round(effectiveVolume * 100)}</span>
        {/* A rotated horizontal slider: the track/thumb styling stays shared with the progress bar. */}
        <div className="relative h-24 w-full">
          <RangeSlider
            label={message.volume}
            value={effectiveVolume}
            max={1}
            onValueChange={commands.setVolume}
            className="absolute left-1/2 top-1/2 w-24 -translate-x-1/2 -translate-y-1/2 -rotate-90"
          />
        </div>
      </div>
    </ControlPopover>
  );
}

function PlaybackRateControl({ playbackRate, onSelect }: { playbackRate: number; onSelect: (playbackRate: number) => void }) {
  const message = useMessage().player;
  return (
    <ControlPopover
      trigger={(
        <Button tone="media" size="sm" aria-label={`${message.playbackRate} ${playbackRate}x`} layoutClassName="min-w-11 tabular-nums">
          {playbackRate}x
        </Button>
      )}
    >
      <div role="group" aria-label={message.playbackRate} className="flex flex-col-reverse gap-0.5">
        {PLAYBACK_RATES.map(rate => (
          <Button
            key={rate}
            tone="media"
            size="sm"
            aria-pressed={rate === playbackRate}
            onClick={() => onSelect(rate)}
            layoutClassName="w-14 tabular-nums"
          >
            {rate}x
          </Button>
        ))}
      </div>
    </ControlPopover>
  );
}

const FADE_CLASS = 'absolute inset-x-0 bottom-0 transition-opacity duration-(--duration-medium)';

export function PlayerControls({ state, commands, isVisible }: PlayerControlsProps) {
  const message = useMessage().player;
  const playLabel = state.isPlaying ? message.pause : message.play;
  const visibilityClass = isVisible ? 'opacity-100' : 'pointer-events-none opacity-0';

  // NOTE: Mirrors PlayerTopBar: the scrim is a sibling so its mask never clips the controls.
  return (
    <>
      <div
        aria-hidden
        className={cn(
          FADE_CLASS,
          'pointer-events-none h-36 bg-linear-to-t from-black/70 to-transparent mask-[linear-gradient(to_top,black_45%,transparent)]',
          visibilityClass,
        )}
      />
      <div onPointerUp={releaseFocus} className={cn(FADE_CLASS, 'flex flex-col gap-1 px-4 pb-3 text-white', visibilityClass)}>
        <RangeSlider
          label={message.progress}
          value={state.currentTime}
          max={state.duration}
          step={0.1}
          onValueChange={commands.seekTo}
          className="mx-2"
        />

        <div className="flex items-center gap-1">
          <ControlButton label={message.previous} onClick={commands.playPrevious}><SkipBack className="fill-current" /></ControlButton>
          <ControlButton label={playLabel} onClick={commands.togglePlay}>
            {state.isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          </ControlButton>
          <ControlButton label={message.next} onClick={commands.playNext}><SkipForward className="fill-current" /></ControlButton>
          <VolumeControl state={state} commands={commands} />
          <span className="ml-2 text-control font-medium tabular-nums">
            {formatDuration(state.currentTime)}
            <span className="text-white/60"> / {formatDuration(state.duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            <PlaybackRateControl playbackRate={state.playbackRate} onSelect={commands.setPlaybackRate} />
            <ControlButton label={state.isFullscreen ? message.exitFullscreen : message.enterFullscreen} onClick={commands.toggleFullscreen}>
              {state.isFullscreen ? <Minimize /> : <Maximize />}
            </ControlButton>
          </div>
        </div>
      </div>
    </>
  );
}
