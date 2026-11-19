import { Languages, MonitorPlay, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { SettingPanel, type SettingCategory } from '../../feature/setting/setting-panel';
import { useMessage } from '../../feature/setting/use-message';
import { BackButton } from '../../shared/ui/back-button';
import { BrowseShell } from '../../shared/ui/browse-shell';
import { NavList } from '../../shared/ui/nav-list';
import { TEXT_CLASS } from '../../shared/ui/text-class';

const CATEGORY_NAV: readonly { category: SettingCategory; icon: LucideIcon }[] = [
  { category: 'playback', icon: MonitorPlay },
  { category: 'language', icon: Languages },
];

export function SettingPage({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState<SettingCategory>('playback');
  const message = useMessage();
  const navEntries = CATEGORY_NAV.map(({ category: navCategory, icon }) => ({
    value: navCategory,
    icon,
    label: message.setting.category[navCategory],
  }));

  return (
    <BrowseShell
      topBarStart={(
        <div className="flex items-center gap-2">
          <BackButton label={message.common.back} onBack={onBack} />
          <span aria-hidden className="h-4 w-px shrink-0 bg-line" />
          <h1 className={TEXT_CLASS.barTitle}>{message.common.setting}</h1>
        </div>
      )}
      sidebar={<NavList label={message.common.setting} entries={navEntries} currentValue={category} onSelect={setCategory} />}
    >
      <SettingPanel category={category} />
    </BrowseShell>
  );
}
