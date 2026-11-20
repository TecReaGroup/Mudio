import { Power } from 'lucide-react';
import { mudio } from '../../shared/api/mudio';
import { BrandMark } from '../../shared/ui/brand-mark';
import { Button } from '../../shared/ui/button';
import { useMessage } from '../setting/use-message';

/**
 * Fills the tray menu window; electron/tray/tray-menu-window.ts sizes that window to fit this layout.
 * The p-3 gutter stays transparent so the shadow has room to fall.
 */
export function TrayMenu() {
  const message = useMessage().tray;
  return (
    <div className="h-full p-3">
      <menu className="flex h-full flex-col rounded-card border border-line bg-surface p-1 shadow-raised">
        <li>
          <Button tone="ghost" size="md" layoutClassName="w-full justify-start" onClick={() => mudio.trayMenu.openLibrary()}>
            <BrandMark />
            {message.showLibrary}
          </Button>
        </li>
        <li role="separator" className="mx-2 my-1 h-px bg-line-subtle" />
        <li>
          <Button tone="quietDanger" size="md" layoutClassName="w-full justify-start" onClick={() => mudio.trayMenu.quit()}>
            <Power />
            {message.quit}
          </Button>
        </li>
      </menu>
    </div>
  );
}
