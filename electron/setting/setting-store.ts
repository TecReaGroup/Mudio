import { join } from 'node:path';
import { app, ipcMain, nativeTheme } from 'electron';
import { IPC_CHANNEL, LANGUAGES, THEME_PREFERENCES, type AppSetting, type Language, type ThemePreference } from '../../src/shared/contract/mudio-contract';
import { log } from '../log/logger';
import { JsonFile } from '../shared/json-file';

const SETTING_FILE_NAME = 'setting.json';

function defaultSetting(): AppSetting {
  return {
    theme: 'system',
    language: app.getLocale().startsWith('zh') ? 'zh-CN' : 'en',
    autoplayNext: true,
    resumePlayback: true,
  };
}

function parseSetting(value: unknown): AppSetting {
  const candidate = value as Partial<AppSetting> | null;
  if (
    !candidate
    || !THEME_PREFERENCES.includes(candidate.theme as ThemePreference)
    || !LANGUAGES.includes(candidate.language as Language)
    || typeof candidate.autoplayNext !== 'boolean'
    || typeof candidate.resumePlayback !== 'boolean'
  ) {
    throw new TypeError('Invalid setting');
  }
  return {
    theme: candidate.theme as ThemePreference,
    language: candidate.language as Language,
    autoplayNext: candidate.autoplayNext,
    resumePlayback: candidate.resumePlayback,
  };
}

/** Owns persisted user settings and applies the ones the main process controls. */
export class SettingStore {
  private constructor(private readonly document: JsonFile<Partial<AppSetting>>, private setting: AppSetting) {
    this.applyToMainProcess();
  }

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
    this.applyToMainProcess();
    log('info', 'Setting', `Saved theme=${setting.theme} language=${setting.language} autoplayNext=${setting.autoplayNext} resumePlayback=${setting.resumePlayback}`);
    await this.document.write(setting);
  }

  // nativeTheme drives the renderer's prefers-color-scheme, so CSS needs no theme class.
  private applyToMainProcess(): void {
    nativeTheme.themeSource = this.setting.theme;
  }
}

export function registerSettingIpc(store: SettingStore): void {
  ipcMain.handle(IPC_CHANNEL.settingLoad, () => store.current());
  ipcMain.handle(IPC_CHANNEL.settingSave, (_event, setting: unknown) => store.save(parseSetting(setting)));
}
