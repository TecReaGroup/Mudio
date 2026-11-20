import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { IPC_CHANNEL, LANGUAGES, PLAYBACK_ORDERS, type AppSetting, type Language, type PlaybackOrder } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';
import { JsonFile } from '../shared/json-file';

const SETTING_FILE_NAME = 'setting.json';

function defaultSetting(): AppSetting {
  return {
    language: app.getLocale().startsWith('zh') ? 'zh-CN' : 'en',
    playbackOrder: 'sequential',
    resumePlayback: true,
  };
}

function parseSetting(value: unknown): AppSetting {
  const candidate = value as Partial<AppSetting> | null;
  if (
    !candidate
    || !LANGUAGES.includes(candidate.language as Language)
    || !PLAYBACK_ORDERS.includes(candidate.playbackOrder as PlaybackOrder)
    || typeof candidate.resumePlayback !== 'boolean'
  ) {
    throw new TypeError('Invalid setting');
  }
  return {
    language: candidate.language as Language,
    playbackOrder: candidate.playbackOrder as PlaybackOrder,
    resumePlayback: candidate.resumePlayback,
  };
}

/** Keeps each valid stored field and falls back per field, so one bad value (e.g. an unknown language) cannot crash rendering. */
function storedSettingOverDefaults(stored: unknown): AppSetting {
  const fallback = defaultSetting();
  const candidate = (typeof stored === 'object' && stored !== null ? stored : {}) as Partial<Record<keyof AppSetting, unknown>>;
  return {
    language: LANGUAGES.includes(candidate.language as Language) ? candidate.language as Language : fallback.language,
    playbackOrder: PLAYBACK_ORDERS.includes(candidate.playbackOrder as PlaybackOrder)
      ? candidate.playbackOrder as PlaybackOrder
      : fallback.playbackOrder,
    resumePlayback: typeof candidate.resumePlayback === 'boolean' ? candidate.resumePlayback : fallback.resumePlayback,
  };
}

/** Owns persisted user settings. */
export class SettingStore {
  private constructor(
    private readonly document: JsonFile<Partial<AppSetting>>,
    private setting: AppSetting,
    private readonly onChanged: (setting: AppSetting) => void,
  ) {}

  static async open(dataDirectory: string, onChanged: (setting: AppSetting) => void): Promise<SettingStore> {
    const document = new JsonFile<Partial<AppSetting>>(join(dataDirectory, SETTING_FILE_NAME));
    const stored = await document.read({});
    return new SettingStore(document, storedSettingOverDefaults(stored), onChanged);
  }

  current(): AppSetting {
    return this.setting;
  }

  async save(setting: AppSetting): Promise<void> {
    this.setting = setting;
    log('info', 'Setting', `Saved language=${setting.language} playbackOrder=${setting.playbackOrder} resumePlayback=${setting.resumePlayback}`);
    this.onChanged(setting);
    await this.document.write(setting);
  }
}

export function registerSettingIpc(store: SettingStore): void {
  ipcMain.handle(IPC_CHANNEL.settingLoad, () => store.current());
  ipcMain.handle(IPC_CHANNEL.settingSave, (_event, setting: unknown) => store.save(parseSetting(setting)));
}
