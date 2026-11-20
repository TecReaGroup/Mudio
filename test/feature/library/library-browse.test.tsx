import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installFakeMudio } from '../../support/fake-mudio';
import { buildFolder, buildRecentRequest, buildScannedSnapshot, buildVideo } from '../../support/fixture';
import { renderLibraryWindow } from '../../support/render-app';

const BEACH_SUNSET = buildVideo(1, { title: 'Beach Sunset' });
const CITY_NIGHT = buildVideo(2, { title: 'City Night' });
const BEACH_PARTY = buildVideo(3, { title: 'beach party' });

function cardOf(title: string): HTMLElement {
  return screen.getByRole('button', { name: title }).closest('article')!;
}

function cardTitles(): string[] {
  return within(screen.getByRole('main')).queryAllByRole('heading', { level: 3 }).map(heading => heading.textContent ?? '');
}

describe('library browsing', () => {
  it('lists every video in library order', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET, CITY_NIGHT, BEACH_PARTY] }) });
    await renderLibraryWindow();

    expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeDefined();
    expect(screen.getByText('· 3 videos')).toBeDefined();
    expect(cardTitles()).toEqual(['Beach Sunset', 'City Night', 'beach party']);
  });

  it('lists only videos found under library folders, leaving directly opened ones to Recent', async () => {
    installFakeMudio({
      snapshot: buildScannedSnapshot({
        videos: [BEACH_SUNSET, CITY_NIGHT],
        recentIds: [CITY_NIGHT.id],
        folders: [buildFolder('D:\\Videos', [BEACH_SUNSET.id])],
      }),
    });
    const user = await renderLibraryWindow();

    expect(cardTitles()).toEqual(['Beach Sunset']);
    await user.click(screen.getByRole('button', { name: 'Recent' }));
    expect(cardTitles()).toEqual(['City Night']);
  });

  it('filters by title, case-insensitively, ignoring surrounding spaces', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET, CITY_NIGHT, BEACH_PARTY] }) });
    const user = await renderLibraryWindow();

    await user.type(screen.getByRole('searchbox'), '  BEACH ');

    await waitFor(() => expect(cardTitles()).toEqual(['Beach Sunset', 'beach party']));
    expect(screen.getByText('· 2 videos')).toBeDefined();
  });

  it('clears the search with Escape', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET, CITY_NIGHT] }) });
    const user = await renderLibraryWindow();
    const searchbox = screen.getByRole<HTMLInputElement>('searchbox');

    await user.type(searchbox, 'city');
    await user.keyboard('{Escape}');

    expect(searchbox.value).toBe('');
    await waitFor(() => expect(cardTitles()).toHaveLength(2));
  });

  it('offers to clear a search that matches nothing, then refocuses the search box', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET] }) });
    const user = await renderLibraryWindow();

    await user.type(screen.getByRole('searchbox'), 'zzz');
    const main = screen.getByRole('main');
    expect(await within(main).findByText('No videos match "zzz"')).toBeDefined();
    await user.click(within(main).getByRole('button', { name: 'Clear search' }));

    expect(document.activeElement).toBe(screen.getByRole('searchbox'));
    await waitFor(() => expect(cardTitles()).toEqual(['Beach Sunset']));
  });

  it('sends the empty library to the folder setting', async () => {
    installFakeMudio();
    const user = await renderLibraryWindow();

    expect(screen.getByText('Your library is empty')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Add Folder' }));

    expect(await screen.findByText('Library folders')).toBeDefined();
  });

  it('keeps the library usable and explains why when the initial load fails', async () => {
    installFakeMudio({ libraryLoadError: new Error('library.json is locked') });
    await renderLibraryWindow();

    expect(screen.getByRole('alert').textContent).toBe('Failed to load the library: library.json is locked');
    expect(screen.getByText('Your library is empty')).toBeDefined();
  });

  it('shows a library change pushed from the main process', async () => {
    const fake = installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET] }) });
    await renderLibraryWindow();

    act(() => fake.pushLibrary(buildScannedSnapshot({ videos: [BEACH_SUNSET, CITY_NIGHT] })));

    expect(cardTitles()).toEqual(['Beach Sunset', 'City Night']);
  });
});

describe('starting playback from the library', () => {
  it('plays a video in the Recent queue, appending it when it was never played', async () => {
    const fake = installFakeMudio({
      snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET, CITY_NIGHT], recentIds: [BEACH_SUNSET.id] }),
    });
    const user = await renderLibraryWindow();

    await user.click(screen.getByRole('button', { name: 'City Night' }));

    expect(fake.api.player.open).toHaveBeenCalledWith(buildRecentRequest(CITY_NIGHT.id, [BEACH_SUNSET.id, CITY_NIGHT.id]));
  });

  it('keeps Recent order when the played video is already in it', async () => {
    const fake = installFakeMudio({
      snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET, CITY_NIGHT], recentIds: [CITY_NIGHT.id, BEACH_SUNSET.id] }),
    });
    const user = await renderLibraryWindow();

    await user.click(screen.getByRole('button', { name: 'Beach Sunset' }));

    expect(fake.api.player.open).toHaveBeenCalledWith(buildRecentRequest(BEACH_SUNSET.id, [CITY_NIGHT.id, BEACH_SUNSET.id]));
  });

  it('plays a video the OS asked to open before the window was ready', async () => {
    const fake = installFakeMudio({
      snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET, CITY_NIGHT] }),
      pendingLaunchVideoId: CITY_NIGHT.id,
    });
    await renderLibraryWindow();

    await waitFor(() => expect(fake.api.player.open).toHaveBeenCalledWith(buildRecentRequest(CITY_NIGHT.id, [CITY_NIGHT.id])));
  });

  it('imports dropped files and plays them in the order they were dropped', async () => {
    const fake = installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET], recentIds: [BEACH_SUNSET.id] }) });
    fake.api.library.importPaths.mockResolvedValue([BEACH_PARTY, CITY_NIGHT]);
    await renderLibraryWindow();
    const files = [new File([''], 'party.mp4'), new File([''], 'night.mp4')];

    fireEvent.dragEnter(screen.getByRole('main'), { dataTransfer: { types: ['Files'], files } });
    expect(screen.getByText('Release to open videos')).toBeDefined();
    fireEvent.drop(screen.getByRole('main'), { dataTransfer: { types: ['Files'], files } });

    expect(screen.queryByText('Release to open videos')).toBeNull();
    expect(fake.api.library.importPaths).toHaveBeenCalledWith(['D:\\Drop\\party.mp4', 'D:\\Drop\\night.mp4']);
    await waitFor(() => expect(fake.api.player.open).toHaveBeenCalledWith(
      buildRecentRequest(BEACH_PARTY.id, [BEACH_SUNSET.id, BEACH_PARTY.id, CITY_NIGHT.id]),
    ));
  });

  it('does not open the player when the drop held no supported video', async () => {
    const fake = installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET] }) });
    await renderLibraryWindow();

    fireEvent.drop(screen.getByRole('main'), { dataTransfer: { types: ['Files'], files: [new File([''], 'notes.txt')] } });

    await waitFor(() => expect(fake.api.library.importPaths).toHaveBeenCalledOnce());
    expect(fake.api.player.open).not.toHaveBeenCalled();
  });
});

describe('Recent', () => {
  it('lists played videos in Recent order and removes one without touching the library', async () => {
    const fake = installFakeMudio({
      snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET, CITY_NIGHT, BEACH_PARTY], recentIds: [BEACH_PARTY.id, BEACH_SUNSET.id] }),
    });
    const user = await renderLibraryWindow();

    await user.click(screen.getByRole('button', { name: 'Recent' }));
    expect(cardTitles()).toEqual(['beach party', 'Beach Sunset']);
    await user.click(within(cardOf('beach party')).getByRole('button', { name: 'Remove from Recent' }));

    expect(fake.api.library.removeFromRecent).toHaveBeenCalledWith(BEACH_PARTY.id);
    expect(fake.api.library.remove).not.toHaveBeenCalled();
  });

  it('offers no Edit in Recent', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET], recentIds: [BEACH_SUNSET.id] }) });
    const user = await renderLibraryWindow();

    await user.click(screen.getByRole('button', { name: 'Recent' }));

    expect(within(cardOf('Beach Sunset')).queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('offers no "Remove from Recent" outside Recent', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET], recentIds: [BEACH_SUNSET.id] }) });
    await renderLibraryWindow();

    expect(within(cardOf('Beach Sunset')).queryByRole('button', { name: 'Remove from Recent' })).toBeNull();
  });

  it('explains an empty Recent', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET] }) });
    const user = await renderLibraryWindow();

    await user.click(screen.getByRole('button', { name: 'Recent' }));

    expect(screen.getByText('No playback history yet')).toBeDefined();
  });

  it('returns to the section it left after visiting Settings', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [BEACH_SUNSET] }) });
    const user = await renderLibraryWindow();

    await user.click(screen.getByRole('button', { name: 'Recent' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('button', { name: 'Recent' }).getAttribute('aria-current')).toBe('page');
  });
});
