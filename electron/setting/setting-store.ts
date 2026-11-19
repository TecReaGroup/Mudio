import { join } from 'node:path';
import { app, ipcMain } from 'electron';
import { IPC_CHANNEL, LANGUAGES, type AppSetting, type Language } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';
import { JsonFile } from '../shared/json-file';

const SETTING_FILE_NAME = 'setting.json';

function defaultSetting(): AppSetting {
  return {
    language: app.getLocale().startsWith('zh') ? 'zh-CN' : 'en',
    autoplayNext: true,
    resumePlayback: true,
  };
}

function parseSetting(value: unknown): AppSetting {
  const candidate = value as Partial<AppSetting> | null;
  if (
    !candidate
    || !LANGUAGES.includes(candidate.language as Language)
    || typeof candidate.autoplayNext !== 'boolean'
    || typeof candidate.resumePlayback !== 'boolean'
  ) {
    throw new TypeError('Invalid setting');
  }
  return {
    language: candidate.language as Language,
    autoplayNext: candidate.autoplayNext,
    resumePlayback: candidate.resumePlayback,
  };
}

/** Owns persisted user settings. */
export class SettingStore {
  private constructor(private readonly document: JsonFile<Partial<AppSetting>>, private setting: AppSetting) {}

  static async open(dataDirectory: string): Promise<SettingStore> {
    const document = new JsonFile<Partial<AppSetting>>(join(dataDirectory, SETTING_FILE_NAME));
    const stored = await document.read({});
    return new SettingStore(document, { ...defaultSetting(), ...stored });
  }

  current(): AppSetting {
    return this.setting;
  }

  async save(setting: AppSetting): Promise<void> {
    this.setting = setting;
    log('info', 'Setting', `Saved language=${setting.language} autoplayNext=${setting.autoplayNext} resumePlayback=${setting.resumePlayback}`);
    await this.document.write(setting);
  }
}

export function registerSettingIpc(store: SettingStore): void {
  ipcMain.handle(IPC_CHANNEL.settingLoad, () => store.current());
  ipcMain.handle(IPC_CHANNEL.settingSave, (_event, setting: unknown) => store.save(parseSetting(setting)));
}
