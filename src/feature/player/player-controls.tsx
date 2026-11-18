import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../shared/lib/cn';
import { formatDuration } from '../../shared/lib/format';
import { Button } from '../../shared/ui/button';
import { RangeSlider } from '../../shared/ui/range-slider';

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
    <Button size="icon" title={label} aria-label={label} onClick={onClick} disabled={!onClick} className="text-white hover:bg-white/15 [&_svg]:size-[18px]">
      {children}
    </Button>
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
  return (
    <div
      onPointerUp={releaseFocus}
      className={cn(
        'absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-12 text-white transition-opacity duration-200',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <RangeSlider
        label="播放进度"
        value={state.currentTime}
        max={state.duration}
        step={0.1}
        onValueChange={commands.seekTo}
        className="block w-full"
      />
      <div className="mt-1.5 flex items-center gap-1">
        <ControlButton label="上一个" onClick={commands.playPrevious}><SkipBack className="fill-current" /></ControlButton>
        <ControlButton label={state.isPlaying ? '暂停 (空格)' : '播放 (空格)'} onClick={commands.togglePlay}>
          {state.isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </ControlButton>
        <ControlButton label="下一个" onClick={commands.playNext}><SkipForward className="fill-current" /></ControlButton>
        <span className="ml-2 text-xs tabular-nums text-white/85">
          {formatDuration(state.currentTime)} / {formatDuration(state.duration)}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <ControlButton label={state.isMuted ? '取消静音 (M)' : '静音 (M)'} onClick={commands.toggleMute}>
            <VolumeIcon volume={state.volume} isMuted={state.isMuted} />
          </ControlButton>
          <RangeSlider
            label="音量"
            value={state.isMuted ? 0 : state.volume}
            max={1}
            onValueChange={commands.setVolume}
            className="w-20"
          />
          <Button
            title="播放速度"
            onClick={commands.cyclePlaybackRate}
            className="ml-1 h-8 min-w-12 px-2 text-xs tabular-nums text-white hover:bg-white/15"
          >
            {state.playbackRate}x
          </Button>
          <ControlButton label={state.isFullscreen ? '退出全屏 (F)' : '全屏 (F)'} onClick={commands.toggleFullscreen}>
            {state.isFullscreen ? <Minimize /> : <Maximize />}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
