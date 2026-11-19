import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installFakeMudio } from '../../support/fake-mudio';
import { buildRecentRequest, buildSnapshot, buildVideos } from '../../support/fixture';
import { renderPlayerWindow } from '../../support/render-app';

// NOTE: video-player.tsx keeps volume and mute in module state for the window's lifetime, which carries across
// tests in this file. Each test leaves volume 1 unmuted, except the last, which lowers it.
const VOLUME_STEPS_FROM_FULL_TO_SILENT = 10;

const VIDEOS = buildVideos(2);

async function openPlayer() {
  installFakeMudio({ snapshot: buildSnapshot({ videos: VIDEOS }), pendingPlaybackRequest: buildRecentRequest(VIDEOS[0].id, [VIDEOS[0].id]) });
  return renderPlayerWindow();
}

function pressKey(key: string, times = 1) {
  for (let press = 0; press < times; press += 1) act(() => { fireEvent.keyDown(window, { key }); });
}

function volumeSlider(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('slider', { name: 'Volume' });
}

describe('player keyboard shortcuts', () => {
  it('toggles mute with M', async () => {
    await openPlayer();

    pressKey('m');
    expect(screen.getByRole('button', { name: 'Unmute (M)' })).toBeDefined();
    expect(document.querySelector('video')!.muted).toBe(true);

    pressKey('M');
    expect(screen.getByRole('button', { name: 'Mute (M)' })).toBeDefined();
  });

  it('ignores shortcuts combined with Ctrl, so app-level shortcuts keep working', async () => {
    await openPlayer();

    act(() => { fireEvent.keyDown(window, { key: 'm', ctrlKey: true }); });

    expect(screen.getByRole('button', { name: 'Mute (M)' })).toBeDefined();
  });

  it('never raises the volume past 100', async () => {
    await openPlayer();

    pressKey('ArrowUp', 3);

    expect(Number(volumeSlider().value)).toBe(1);
  });

  // 1 - 0.1 × 10 is 1.9e-16 in floating point, not 0: the volume reads 0 but is not muted, and an
  // eleventh press is needed to actually reach silence.
  it('lands exactly on 0 and mutes after stepping down from full volume', async () => {
    await openPlayer();

    pressKey('ArrowDown', VOLUME_STEPS_FROM_FULL_TO_SILENT);

    expect(Number(volumeSlider().value)).toBe(0);
    expect(screen.getByRole('button', { name: 'Unmute (M)' })).toBeDefined();
  });
});
