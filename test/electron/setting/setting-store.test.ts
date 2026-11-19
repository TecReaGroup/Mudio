import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSettingIpc, SettingStore } from '../../../electron/setting/setting-store';
import { IPC_CHANNEL, type AppSetting } from '../../../src/shared/contract/mudio-contract';
import { createTempDirectory } from '../../support/temp-directory';

vi.mock('../../../electron/log/logger', () => import('../../support/silent-logger'));
vi.mock('electron', () => ({
  app: { getLocale: vi.fn(() => 'zh-CN') },
  ipcMain: { handle: vi.fn() },
}));

const VALID_SETTING: AppSetting = { language: 'en', playbackOrder: 'repeat-one', resumePlayback: false };

describe('SettingStore', () => {
  let directory: Awaited<ReturnType<typeof createTempDirectory>>;

  const writeStoredSetting = async (stored: unknown) => {
    await mkdir(directory.path, { recursive: true });
    await writeFile(join(directory.path, 'setting.json'), JSON.stringify(stored), 'utf8');
  };

  beforeEach(async () => {
    directory = await createTempDirectory('setting-store');
    vi.mocked(app.getLocale).mockReturnValue('zh-CN');
    vi.mocked(ipcMain.handle).mockClear();
  });

  afterEach(() => directory.remove());

  it('defaults to the system language on first launch', async () => {
    vi.mocked(app.getLocale).mockReturnValue('en-US');
    const store = await SettingStore.open(directory.path, vi.fn());
    expect(store.current()).toEqual({ language: 'en', playbackOrder: 'sequential', resumePlayback: true });
  });

  it('defaults to Simplified Chinese on a Chinese system', async () => {
    const store = await SettingStore.open(directory.path, vi.fn());
    expect(store.current().language).toBe('zh-CN');
  });

  it('fills fields missing from an older setting file with defaults', async () => {
    await writeStoredSetting({ language: 'en' });
    const store = await SettingStore.open(directory.path, vi.fn());
    expect(store.current()).toEqual({ language: 'en', playbackOrder: 'sequential', resumePlayback: true });
  });

  // An unknown language would make MESSAGES[language] undefined and crash every window on render.
  it('replaces invalid stored values with defaults instead of loading them', async () => {
    await writeStoredSetting({ language: 'fr', playbackOrder: 'shuffle', resumePlayback: 'yes' });
    const store = await SettingStore.open(directory.path, vi.fn());
    expect(store.current()).toEqual({ language: 'zh-CN', playbackOrder: 'sequential', resumePlayback: true });
  });

  it('saves, notifies every window and persists across reopen', async () => {
    const onChanged = vi.fn();
    const store = await SettingStore.open(directory.path, onChanged);

    await store.save(VALID_SETTING);

    expect(onChanged).toHaveBeenCalledWith(VALID_SETTING);
    expect((await SettingStore.open(directory.path, vi.fn())).current()).toEqual(VALID_SETTING);
  });

  it('rejects an invalid setting sent over IPC without changing the stored one', async () => {
    const store = await SettingStore.open(directory.path, vi.fn());
    registerSettingIpc(store);
    const saveHandler = vi.mocked(ipcMain.handle).mock.calls.find(([channel]) => channel === IPC_CHANNEL.settingSave)![1];
    const before = store.current();

    await expect(async () => saveHandler({} as never, { ...VALID_SETTING, language: 'fr' })).rejects.toThrow('Invalid setting');
    expect(store.current()).toEqual(before);
  });
});
