import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installFakeMudio } from '../support/fake-mudio';
import { buildFolder, buildPlaylist, buildRecentRequest, buildSnapshot, buildVideo, LONG_UNBROKEN_TEXT } from '../support/fixture';
import { expectTextContained } from '../support/layout-guard';
import { renderLibraryWindow, renderPlayerWindow } from '../support/render-app';

// Every string a user or their file system controls, at a length no window can fit on one line.
const LONG_TITLE = `Title${LONG_UNBROKEN_TEXT}`;
const LONG_PLAYLIST_TITLE = `Playlist${LONG_UNBROKEN_TEXT}`;
const LONG_FOLDER_PATH = `D:\\${LONG_UNBROKEN_TEXT}`;
const LONG_VIDEO = buildVideo(1, { title: LONG_TITLE, filePath: `${LONG_FOLDER_PATH}\\${LONG_UNBROKEN_TEXT}.mp4` });
const SHORT_VIDEO = buildVideo(2);
const SNAPSHOT = buildSnapshot({
  videos: [LONG_VIDEO, SHORT_VIDEO],
  recentIds: [LONG_VIDEO.id],
  playlists: [buildPlaylist('p1', LONG_PLAYLIST_TITLE, [LONG_VIDEO.id])],
  folders: [buildFolder(LONG_FOLDER_PATH, [LONG_VIDEO.id])],
});

describe('long text stays inside its container', () => {
  describe('library window', () => {
    it('video card title and file meta', async () => {
      installFakeMudio({ snapshot: SNAPSHOT });
      await renderLibraryWindow();

      const card = screen.getByRole('button', { name: LONG_TITLE }).closest('article')!;
      expectTextContained(screen.getByRole('button', { name: LONG_TITLE }));
      expectTextContained(within(card).getByText(/^MP4 · /));
    });

    it('"no match" message echoing a long search query', async () => {
      installFakeMudio({ snapshot: SNAPSHOT });
      await renderLibraryWindow();

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: LONG_UNBROKEN_TEXT.toLowerCase() + 'zzz' } });

      expectTextContained(await screen.findByText(/^No videos match/));
    });

    it('error banner carrying a long error message', async () => {
      installFakeMudio({ libraryLoadError: new Error(LONG_UNBROKEN_TEXT) });
      await renderLibraryWindow();

      expectTextContained(within(screen.getByRole('alert')).getByText(/^Failed to load the library/));
    });

    it('playlist card and playlist page title', async () => {
      installFakeMudio({ snapshot: SNAPSHOT });
      const user = await renderLibraryWindow();
      await user.click(screen.getByRole('button', { name: 'Playlist' }));

      expectTextContained(screen.getByRole('button', { name: LONG_PLAYLIST_TITLE }));
      await user.click(screen.getByRole('button', { name: LONG_PLAYLIST_TITLE }));
      expectTextContained(screen.getByRole('heading', { level: 1, name: LONG_PLAYLIST_TITLE }));
    });

    it('edit dialog: file path, playlist chip and "create" option', async () => {
      installFakeMudio({ snapshot: SNAPSHOT });
      const user = await renderLibraryWindow();
      const card = screen.getByRole('button', { name: LONG_TITLE }).closest('article')!;
      await user.click(within(card).getByRole('button', { name: 'Edit' }));
      const dialog = screen.getByRole('dialog', { name: 'Edit video' });
      const combobox = within(dialog).getByRole('combobox', { name: 'Playlists' });

      expect(dialog.className).toContain('calc(100vw-2rem)');
      expectTextContained(within(dialog).getByTitle(LONG_VIDEO.filePath));
      expectTextContained(within(dialog).getByText(LONG_PLAYLIST_TITLE));
      fireEvent.change(combobox, { target: { value: LONG_UNBROKEN_TEXT } });
      expectTextContained(within(dialog).getByText(`Create "${LONG_UNBROKEN_TEXT}"`));
    });

    it('library folder row and its removal confirmation', async () => {
      installFakeMudio({ snapshot: SNAPSHOT });
      const user = await renderLibraryWindow();
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await user.click(screen.getByRole('button', { name: 'Folders' }));

      expectTextContained(screen.getByTitle(LONG_FOLDER_PATH));
      await user.click(screen.getByRole('button', { name: 'Remove folder' }));
      expectTextContained(within(screen.getByRole('dialog')).getByText(new RegExp(LONG_UNBROKEN_TEXT)));
    });
  });

  describe('player window', () => {
    it('video title over the player, queue title and queue rows', async () => {
      installFakeMudio({
        snapshot: SNAPSHOT,
        pendingPlaybackRequest: {
          ...buildRecentRequest(LONG_VIDEO.id, [LONG_VIDEO.id, SHORT_VIDEO.id]),
          playlistTitle: LONG_PLAYLIST_TITLE,
        },
      });
      const { playlistPanel } = await renderPlayerWindow();

      expectTextContained(within(screen.getByRole('main')).getByRole('heading', { name: LONG_TITLE }));
      expectTextContained(within(playlistPanel).getByRole('heading', { name: LONG_PLAYLIST_TITLE }));
      expectTextContained(within(playlistPanel).getByText(LONG_TITLE));
    });
  });
});
