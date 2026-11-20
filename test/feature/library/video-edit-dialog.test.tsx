import { act, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { installFakeMudio } from '../../support/fake-mudio';
import { buildFolder, buildPlaylist, buildScannedSnapshot, buildVideo } from '../../support/fixture';
import { renderLibraryWindow } from '../../support/render-app';

const TRIP_CLIP = buildVideo(1, { title: 'Trip Clip', filePath: 'D:\\Videos\\Holiday\\trip.mp4' });
const OTHER_CLIP = buildVideo(2, { title: 'Other Clip' });

/** Opens the edit dialog of the card with this title and returns the dialog. */
async function openEditDialog(user: Awaited<ReturnType<typeof renderLibraryWindow>>, videoTitle: string) {
  const card = screen.getByRole('button', { name: videoTitle }).closest('article')!;
  await user.click(within(card).getByRole('button', { name: 'Edit' }));
  return screen.getByRole('dialog', { name: 'Edit video' });
}

describe('editing a video', () => {
  it('starts with the title focused and saves the trimmed title', async () => {
    const fake = installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP] }) });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');
    const titleInput = within(dialog).getByLabelText('Title');

    expect(document.activeElement).toBe(titleInput);
    await user.clear(titleInput);
    await user.type(titleInput, '  Summer Trip  ');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(fake.api.library.editVideo).toHaveBeenCalledWith(TRIP_CLIP.id, { title: 'Summer Trip', playlistTitles: [] });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('disables Save while the title is blank', async () => {
    installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP] }) });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');

    await user.clear(within(dialog).getByLabelText('Title'));
    await user.type(within(dialog).getByLabelText('Title'), '   ');

    expect(within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Save' }).disabled).toBe(true);
  });

  it('submits with Enter in the title field', async () => {
    const fake = installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP] }) });
    const user = await renderLibraryWindow();
    await openEditDialog(user, 'Trip Clip');

    await user.keyboard('{Enter}');

    expect(fake.api.library.editVideo).toHaveBeenCalledWith(TRIP_CLIP.id, { title: 'Trip Clip', playlistTitles: [] });
  });

  it('discards changes on Cancel', async () => {
    const fake = installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP] }) });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');

    await user.type(within(dialog).getByLabelText('Title'), ' changed');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fake.api.library.editVideo).not.toHaveBeenCalled();
  });

  it('closes by itself when the video is removed while editing', async () => {
    const fake = installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP, OTHER_CLIP] }) });
    const user = await renderLibraryWindow();
    await openEditDialog(user, 'Trip Clip');

    act(() => fake.pushLibrary(buildScannedSnapshot({ videos: [OTHER_CLIP] })));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('playlist picker', () => {
  it('creates a new playlist from typed text with Enter', async () => {
    const fake = installFakeMudio({ snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP] }) });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');
    const combobox = within(dialog).getByRole('combobox', { name: 'Playlists' });

    await user.click(combobox);
    expect(within(dialog).getByText('Type a name to create your first playlist')).toBeDefined();
    await user.type(combobox, 'Road Trip');
    expect(within(dialog).getByRole('option', { name: 'Create "Road Trip"' })).toBeDefined();
    await user.keyboard('{Enter}');

    // Enter picks the playlist; it must not submit the dialog.
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(within(dialog).getByRole('button', { name: 'Remove from "Road Trip"' })).toBeDefined();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(fake.api.library.editVideo).toHaveBeenCalledWith(TRIP_CLIP.id, { title: 'Trip Clip', playlistTitles: ['Road Trip'] });
  });

  it('suggests only playlists the video is not in yet, filtered by the typed text', async () => {
    installFakeMudio({
      snapshot: buildScannedSnapshot({
        videos: [TRIP_CLIP, OTHER_CLIP],
        playlists: [
          buildPlaylist('p1', 'Favorites', [TRIP_CLIP.id]),
          buildPlaylist('p2', 'Road Trip', [OTHER_CLIP.id]),
          buildPlaylist('p3', 'Roadside', [OTHER_CLIP.id]),
        ],
      }),
    });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');
    const combobox = within(dialog).getByRole('combobox', { name: 'Playlists' });

    await user.click(combobox);
    expect(within(dialog).getAllByRole('option').map(option => option.textContent)).toEqual(['Road Trip', 'Roadside']);
    await user.type(combobox, 'side');
    expect(within(dialog).getAllByRole('option').map(option => option.textContent)).toEqual(['Create "side"', 'Roadside']);
  });

  it('picks the only remaining suggestion with Enter instead of creating a duplicate', async () => {
    const fake = installFakeMudio({
      snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP, OTHER_CLIP], playlists: [buildPlaylist('p1', 'Road Trip', [OTHER_CLIP.id])] }),
    });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');

    await user.type(within(dialog).getByRole('combobox', { name: 'Playlists' }), 'Road Trip{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(fake.api.library.editVideo).toHaveBeenCalledWith(TRIP_CLIP.id, { title: 'Trip Clip', playlistTitles: ['Road Trip'] });
  });

  // Typing an existing name in another case is far more likely a lookup than a request for a near-duplicate.
  it('picks an existing playlist whose name differs only in case instead of creating a near-duplicate', async () => {
    const fake = installFakeMudio({
      snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP, OTHER_CLIP], playlists: [buildPlaylist('p1', 'Road Trip', [OTHER_CLIP.id])] }),
    });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');

    await user.type(within(dialog).getByRole('combobox', { name: 'Playlists' }), 'road trip{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(fake.api.library.editVideo).toHaveBeenCalledWith(TRIP_CLIP.id, { title: 'Trip Clip', playlistTitles: ['Road Trip'] });
  });

  it('shows folder playlists as locked chips that Backspace and the chip buttons cannot remove', async () => {
    const fake = installFakeMudio({
      snapshot: buildScannedSnapshot({
        videos: [TRIP_CLIP],
        playlists: [buildPlaylist('p1', 'Holiday', [TRIP_CLIP.id]), buildPlaylist('p2', 'Favorites', [TRIP_CLIP.id])],
        folders: [buildFolder('D:\\Videos\\Holiday', [TRIP_CLIP.id], ['Holiday'])],
      }),
    });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');
    const combobox = within(dialog).getByRole('combobox', { name: 'Playlists' });

    expect(within(dialog).getByTitle('Set by its library folder; change it there').textContent).toBe('Holiday');
    expect(within(dialog).queryByRole('button', { name: 'Remove from "Holiday"' })).toBeNull();
    await user.click(combobox);
    await user.keyboard('{Backspace}{Backspace}');

    expect(within(dialog).queryByRole('button', { name: 'Remove from "Favorites"' })).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(fake.api.library.editVideo).toHaveBeenCalledWith(TRIP_CLIP.id, { title: 'Trip Clip', playlistTitles: ['Holiday'] });
  });

  // jsdom never turns Escape into a dialog "cancel", so only the dropdown half of this contract is observable here.
  it('closes the dropdown on Escape', async () => {
    installFakeMudio({
      snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP, OTHER_CLIP], playlists: [buildPlaylist('p1', 'Road Trip', [OTHER_CLIP.id])] }),
    });
    const user = await renderLibraryWindow();
    const dialog = await openEditDialog(user, 'Trip Clip');

    await user.click(within(dialog).getByRole('combobox', { name: 'Playlists' }));
    expect(within(dialog).getByRole('listbox')).toBeDefined();
    await user.keyboard('{Escape}');

    expect(within(dialog).queryByRole('listbox')).toBeNull();
  });

  describe('dropdown placement', () => {
    const FIELD_HEIGHT_PX = 40;

    /** Places the picker field at `fieldTop` in a 768px-tall window (jsdom's default) before it opens. */
    async function openPickerAt(fieldTop: number) {
      installFakeMudio({
        snapshot: buildScannedSnapshot({ videos: [TRIP_CLIP, OTHER_CLIP], playlists: [buildPlaylist('p1', 'Road Trip', [OTHER_CLIP.id])] }),
      });
      const user = await renderLibraryWindow();
      const dialog = await openEditDialog(user, 'Trip Clip');
      const combobox = within(dialog).getByRole('combobox', { name: 'Playlists' });
      vi.spyOn(combobox.parentElement!, 'getBoundingClientRect').mockReturnValue(
        { top: fieldTop, bottom: fieldTop + FIELD_HEIGHT_PX, left: 0, right: 480, width: 480, height: FIELD_HEIGHT_PX, x: 0, y: fieldTop } as DOMRect,
      );
      await user.click(combobox);
      return within(dialog).getByRole('listbox');
    }

    it('opens downward when there is room below the field', async () => {
      expect((await openPickerAt(200)).className).toContain('top-full');
    });

    it('flips upward near the bottom of the window so it stays on screen', async () => {
      expect((await openPickerAt(680)).className).toContain('bottom-full');
    });
  });
});
