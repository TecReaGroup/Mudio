import { SettingProvider } from '../feature/setting/setting-context';
import { TrayMenu } from '../feature/tray/tray-menu';

/** Root of the tray icon's pop-up menu window. */
export function TrayMenuApp() {
  return (
    <SettingProvider>
      <TrayMenu />
    </SettingProvider>
  );
}
