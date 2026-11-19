import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installFakeMudio } from '../../support/fake-mudio';
import { buildFolder, buildPlaylist, buildSetting, buildSnapshot, buildVideo } from '../../support/fixture';
import { renderLibraryWindow } from '../../support/render-app';

const FOLDER_PATH = 'D:\\Videos\\Holiday';
const HOLIDAY_CLIP = buildVideo(1, { filePath: `${FOLDER_PATH}\\beach.mp4`, sizeBytes: 1024 * 1024 });

/** A promise the test settles by hand, to observe the UI while a main-process call is in flight. */
function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(settle => { resolve = settle; });
  return { promise, resolve };
}

async function openSetting(category?: 'Language' | 'Folders') {
  const user = await renderLibraryWindow();
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  if (category) await user.click(screen.getByRole('button', { name: category }));
  return user;
}

describe('general settings', () => {
  it('saves "Remember progress" as soon as it is toggled', async () => {
    const fake = installFakeMudio();
    const user = await openSetting();
    const toggle = screen.getByRole('switch', { name: 'Remember progress' });

    await user.click(toggle);

    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(fake.api.setting.save).toHaveBeenCalledWith(buildSetting({ resumePlayback: false }));
  });

  it('offers to become the default player on Windows', async () => {
    const fake = installFakeMudio({ platform: 'win32' });
    const user = await openSetting();

    await user.click(screen.getByRole('button', { name: 'Set as Default' }));

    expect(fake.api.defaultPlayer.openSetting).toHaveBeenCalledOnce();
  });

  it('hides the default player row on other platforms', async () => {
    installFakeMudio({ platform: 'darwin' });
    await openSetting();

    expect(screen.queryByRole('button', { name: 'Set as Default' })).toBeNull();
  });
});

describe('language setting', () => {
  it('switches the interface language immediately and saves it', async () => {
    const fake = installFakeMudio();
    const user = await openSetting('Language');

    await user.click(screen.getByRole('radio', { name: '简体中文' }));

    expect(fake.api.setting.save).toHaveBeenCalledWith(buildSetting({ language: 'zh-CN' }));
    expect(screen.getByRole('heading', { level: 1, name: '语言' })).toBeDefined();
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('moves between languages with the arrow keys', async () => {
    const fake = installFakeMudio();
    const user = await openSetting('Language');

    screen.getByRole('radio', { name: 'English' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(fake.api.setting.save).toHaveBeenLastCalledWith(buildSetting({ language: 'zh-CN' }));
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: '简体中文' }));
  });
});

describe('library folder setting', () => {
  it('shows a hint and disables Rescan when no folder was added', async () => {
    installFakeMudio();
    await openSetting('Folders');

    expect(screen.getByText('No folders added yet')).toBeDefined();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Rescan' }).disabled).toBe(true);
  });

  it('keeps both folder actions disabled while a folder is being added', async () => {
    const fake = installFakeMudio();
    const pendingAdd = createDeferred();
    fake.api.libraryFolder.pickAndAdd.mockReturnValue(pendingAdd.promise);
    const user = await openSetting('Folders');
    const addButton = screen.getByRole<HTMLButtonElement>('button', { name: 'Add Folder' });

    await user.click(addButton);
    expect(addButton.disabled).toBe(true);
    expect(addButton.getAttribute('aria-busy')).toBe('true');

    pendingAdd.resolve();
    await waitFor(() => expect(addButton.disabled).toBe(false));
  });

  it('rescans on demand', async () => {
    const fake = installFakeMudio({ snapshot: buildSnapshot({ videos: [HOLIDAY_CLIP], folders: [buildFolder(FOLDER_PATH, [HOLIDAY_CLIP.id])] }) });
    const user = await openSetting('Folders');

    await user.click(screen.getByRole('button', { name: 'Rescan' }));

    expect(fake.api.libraryFolder.rescan).toHaveBeenCalledOnce();
  });

  it('asks before removing a folder, with Cancel focused so Enter cannot remove by accident', async () => {
    const fake = installFakeMudio({ snapshot: buildSnapshot({ videos: [HOLIDAY_CLIP], folders: [buildFolder(FOLDER_PATH, [HOLIDAY_CLIP.id])] }) });
    const user = await openSetting('Folders');

    await user.click(screen.getByRole('button', { name: 'Remove folder' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove this folder?' });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }));
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(fake.api.libraryFolder.remove).toHaveBeenCalledWith(FOLDER_PATH);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('removes nothing when the confirmation is cancelled', async () => {
    const fake = installFakeMudio({ snapshot: buildSnapshot({ videos: [HOLIDAY_CLIP], folders: [buildFolder(FOLDER_PATH, [HOLIDAY_CLIP.id])] }) });
    const user = await openSetting('Folders');

    await user.click(screen.getByRole('button', { name: 'Remove folder' }));
    await user.keyboard('{Enter}');

    expect(fake.api.libraryFolder.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('edits the playlists every video in the folder joins', async () => {
    const fake = installFakeMudio({
      snapshot: buildSnapshot({
        videos: [HOLIDAY_CLIP],
        playlists: [buildPlaylist('p1', 'Summer', [HOLIDAY_CLIP.id])],
        folders: [buildFolder(FOLDER_PATH, [HOLIDAY_CLIP.id], ['Summer'])],
      }),
    });
    const user = await openSetting('Folders');

    await user.click(screen.getByRole('button', { name: 'Edit folder' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit folder' });
    expect(within(dialog).getByText('1 video · 1.0 MB')).toBeDefined();
    await user.type(within(dialog).getByRole('combobox', { name: 'Playlists' }), 'Beach{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(fake.api.libraryFolder.editPlaylists).toHaveBeenCalledWith(FOLDER_PATH, ['Summer', 'Beach']);
  });
});
