import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PlaybackRequest } from '../../../src/shared/contract/mudio-contract';
import { installFakeMudio } from '../../support/fake-mudio';
import { buildRecentRequest, buildSetting, buildSnapshot, buildVideos } from '../../support/fixture';
import { renderPlayerWindow } from '../../support/render-app';

const VIDEOS = buildVideos(3);
const [FIRST, SECOND, THIRD] = VIDEOS;
const ALL_IDS = VIDEOS.map(video => video.id);

async function openPlayer(request: PlaybackRequest, setting = buildSetting()) {
  const fake = installFakeMudio({ snapshot: buildSnapshot({ videos: VIDEOS, recentIds: ALL_IDS }), setting, pendingPlaybackRequest: request });
  return { fake, ...await renderPlayerWindow() };
}

function queueRows(playlistPanel: HTMLElement): HTMLElement[] {
  return within(playlistPanel).getAllByRole('listitem');
}

function currentRowText(playlistPanel: HTMLElement): string {
  return playlistPanel.querySelector('[aria-current="true"]')?.textContent ?? '';
}

function videoElement(): HTMLVideoElement {
  return document.querySelector('video')!;
}

describe('player queue', () => {
  it('shows the queue title, position and the current video', async () => {
    const { playlistPanel } = await openPlayer(buildRecentRequest(SECOND.id, ALL_IDS));

    expect(within(playlistPanel).getByRole('heading', { name: 'Recent' })).toBeDefined();
    expect(within(playlistPanel).getByText('2 / 3')).toBeDefined();
    expect(currentRowText(playlistPanel)).toContain(SECOND.title);
    await waitFor(() => expect(document.title).toBe(SECOND.title));
  });

  it('switches video from the queue and from Previous / Next', async () => {
    const { user, playlistPanel } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Previous' }).disabled).toBe(true);
    await user.click(within(queueRows(playlistPanel)[2]).getAllByRole('button')[0]);
    expect(currentRowText(playlistPanel)).toContain(THIRD.title);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Next' }).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(currentRowText(playlistPanel)).toContain(SECOND.title);
  });

  it('replaces the queue when the library window asks to play something else', async () => {
    const { fake, playlistPanel } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));

    act(() => fake.pushPlayback({ videoId: THIRD.id, playlistIds: [THIRD.id, FIRST.id], playlistTitle: 'Road Trip', playlistId: 'p1' }));

    expect(within(playlistPanel).getByRole('heading', { name: 'Road Trip' })).toBeDefined();
    expect(within(playlistPanel).getByText('1 / 2')).toBeDefined();
  });

  it('returns to the library from the title bar', async () => {
    const { fake, user } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));

    await user.click(screen.getByRole('button', { name: 'Mudio' }));

    expect(fake.api.player.returnToLibrary).toHaveBeenCalledOnce();
  });
});

describe('removing from a Recent queue', () => {
  it('removes a row that is not playing, keeping the current video', async () => {
    const { fake, user, playlistPanel } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));

    await user.click(within(queueRows(playlistPanel)[1]).getByRole('button', { name: 'Remove from Recent' }));

    expect(fake.api.library.removeFromRecent).toHaveBeenCalledWith(SECOND.id);
    expect(queueRows(playlistPanel)).toHaveLength(2);
    expect(currentRowText(playlistPanel)).toContain(FIRST.title);
    expect(within(playlistPanel).getByText('1 / 2')).toBeDefined();
  });

  it('moves to the next video, without autoplay, when the playing one is removed', async () => {
    const { user, playlistPanel } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));
    expect(videoElement().autoplay).toBe(true);

    await user.click(within(queueRows(playlistPanel)[0]).getByRole('button', { name: 'Remove from Recent' }));

    expect(currentRowText(playlistPanel)).toContain(SECOND.title);
    expect(videoElement().autoplay).toBe(false);
  });

  it('falls back to the previous video when the playing one was last', async () => {
    const { user, playlistPanel } = await openPlayer(buildRecentRequest(THIRD.id, ALL_IDS));

    await user.click(within(queueRows(playlistPanel)[2]).getByRole('button', { name: 'Remove from Recent' }));

    expect(currentRowText(playlistPanel)).toContain(SECOND.title);
    expect(within(playlistPanel).getByText('2 / 2')).toBeDefined();
  });

  it('keeps the last remaining video', async () => {
    const { playlistPanel } = await openPlayer(buildRecentRequest(FIRST.id, [FIRST.id]));

    expect(within(playlistPanel).queryByRole('button', { name: 'Remove from Recent' })).toBeNull();
  });

  it('offers no removal in a playlist queue', async () => {
    const { playlistPanel } = await openPlayer({ videoId: FIRST.id, playlistIds: ALL_IDS, playlistTitle: 'Road Trip', playlistId: 'p1' });

    expect(within(playlistPanel).queryByRole('button', { name: 'Remove from Recent' })).toBeNull();
  });
});

describe('playback order', () => {
  it('cycles sequential → repeat one → play once, saving each choice', async () => {
    const { fake, user } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));

    await user.click(screen.getByRole('button', { name: 'Playback order: Play in order' }));
    expect(fake.api.setting.save).toHaveBeenLastCalledWith(buildSetting({ playbackOrder: 'repeat-one' }));
    expect(videoElement().loop).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Playback order: Repeat one' }));
    expect(fake.api.setting.save).toHaveBeenLastCalledWith(buildSetting({ playbackOrder: 'play-once' }));
    expect(videoElement().loop).toBe(false);
    expect(screen.getByRole('button', { name: 'Playback order: Play once' })).toBeDefined();
  });

  it('moves on to the next video at the end only in sequential order', async () => {
    const { playlistPanel } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));

    act(() => { videoElement().dispatchEvent(new Event('ended')); });

    expect(currentRowText(playlistPanel)).toContain(SECOND.title);
  });

  it('stays on the finished video in play-once order', async () => {
    const { playlistPanel } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS), buildSetting({ playbackOrder: 'play-once' }));

    act(() => { videoElement().dispatchEvent(new Event('ended')); });

    expect(currentRowText(playlistPanel)).toContain(FIRST.title);
  });
});

describe('playback progress', () => {
  it('saves the position when playback pauses', async () => {
    const { fake } = await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));
    const video = videoElement();

    // jsdom media elements never advance; pin the position the pause handler reads.
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 42 });
    act(() => { video.dispatchEvent(new Event('pause')); });

    expect(fake.api.library.recordPlayback).toHaveBeenCalledWith(FIRST.id, 42);
  });

  it('shows an explanation instead of a black screen when the file cannot be played', async () => {
    await openPlayer(buildRecentRequest(FIRST.id, ALL_IDS));

    act(() => { videoElement().dispatchEvent(new Event('error')); });

    expect(screen.getByRole('alert').textContent).toContain('Cannot play this video');
  });
});
