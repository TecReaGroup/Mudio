import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installFakeMudio } from '../../support/fake-mudio';
import { buildPlaylist, buildSnapshot, buildVideos } from '../../support/fixture';
import { renderLibraryWindow } from '../../support/render-app';

const [FIRST, SECOND, THIRD] = buildVideos(3);
const ROAD_TRIP = buildPlaylist('p1', 'Road Trip', [THIRD.id, FIRST.id]);
const SNAPSHOT = buildSnapshot({ videos: [FIRST, SECOND, THIRD], playlists: [ROAD_TRIP] });

function cardTitles(): string[] {
  return within(screen.getByRole('main')).queryAllByRole('heading', { level: 3 }).map(heading => heading.textContent ?? '');
}

async function openRoadTrip() {
  const fake = installFakeMudio({ snapshot: SNAPSHOT });
  const user = await renderLibraryWindow();
  await user.click(screen.getByRole('button', { name: 'Playlist' }));
  await user.click(screen.getByRole('button', { name: 'Road Trip' }));
  return { fake, user };
}

describe('playlists', () => {
  it('lists playlists with their video count', async () => {
    installFakeMudio({ snapshot: SNAPSHOT });
    const user = await renderLibraryWindow();

    await user.click(screen.getByRole('button', { name: 'Playlist' }));

    expect(screen.getByText('· 1 playlist')).toBeDefined();
    expect(cardTitles()).toEqual(['Road Trip']);
    expect(screen.getByText('2 videos')).toBeDefined();
  });

  it('explains how to create a playlist when there is none', async () => {
    installFakeMudio({ snapshot: buildSnapshot({ videos: [FIRST] }) });
    const user = await renderLibraryWindow();

    await user.click(screen.getByRole('button', { name: 'Playlist' }));

    expect(screen.getByText('No playlists yet')).toBeDefined();
  });

  it('opens a playlist with its videos in playlist order', async () => {
    await openRoadTrip();

    expect(screen.getByRole('heading', { level: 1, name: 'Road Trip' })).toBeDefined();
    expect(screen.getByText('· 2 videos')).toBeDefined();
    expect(cardTitles()).toEqual([THIRD.title, FIRST.title]);
  });

  it('plays the whole playlist from its first video', async () => {
    const { fake, user } = await openRoadTrip();

    await user.click(screen.getByRole('button', { name: 'Play All' }));

    expect(fake.api.player.open).toHaveBeenCalledWith({
      videoId: THIRD.id,
      playlistIds: [THIRD.id, FIRST.id],
      playlistTitle: 'Road Trip',
      playlistId: ROAD_TRIP.id,
    });
  });

  it('plays the playlist from the clicked video', async () => {
    const { fake, user } = await openRoadTrip();

    await user.click(screen.getByRole('button', { name: FIRST.title }));

    expect(fake.api.player.open).toHaveBeenCalledWith(expect.objectContaining({ videoId: FIRST.id, playlistId: ROAD_TRIP.id }));
  });

  it('plays the playlist as it is now after a library push reordered it', async () => {
    const { fake, user } = await openRoadTrip();
    const reordered = buildPlaylist(ROAD_TRIP.id, ROAD_TRIP.title, [FIRST.id, THIRD.id]);

    act(() => fake.pushLibrary({ ...SNAPSHOT, playlists: [reordered] }));
    await user.click(screen.getByRole('button', { name: 'Play All' }));

    expect(fake.api.player.open).toHaveBeenCalledWith(expect.objectContaining({ videoId: FIRST.id, playlistIds: [FIRST.id, THIRD.id] }));
  });

  it('goes back to the playlist index', async () => {
    const { user } = await openRoadTrip();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Playlist' })).toBeDefined();
  });

  it('falls back to the index when the open playlist is deleted elsewhere', async () => {
    const { fake } = await openRoadTrip();

    act(() => fake.pushLibrary({ ...SNAPSHOT, playlists: [] }));

    expect(screen.getByText('No playlists yet')).toBeDefined();
  });
});
