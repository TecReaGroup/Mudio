import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { AppSetting } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';

interface SettingContextValue {
  setting: AppSetting;
  updateSetting: (patch: Partial<AppSetting>) => void;
}

const SettingContext = createContext<SettingContextValue | null>(null);

export function SettingProvider({ children }: { children: ReactNode }) {
  const [setting, setSetting] = useState<AppSetting | null>(null);

  useEffect(() => {
    mudio.setting.load()
      .then(setSetting)
      .catch(error => log('error', 'Setting', `Failed to load settings: ${describeError(error)}`));
  }, []);

  if (!setting) return null;

  const updateSetting = (patch: Partial<AppSetting>) => {
    const next = { ...setting, ...patch };
    setSetting(next);
    mudio.setting.save(next).catch(error => log('error', 'Setting', `Failed to save settings: ${describeError(error)}`));
  };

  return <SettingContext.Provider value={{ setting, updateSetting }}>{children}</SettingContext.Provider>;
}

export function useSetting(): SettingContextValue {
  const context = useContext(SettingContext);
  if (!context) throw new Error('useSetting must be used inside SettingProvider');
  return context;
}
