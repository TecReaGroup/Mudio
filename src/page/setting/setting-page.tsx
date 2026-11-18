import { ChevronLeft, Languages, MonitorPlay, SunMoon, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { SettingPanel, type SettingCategory } from '../../feature/setting/setting-panel';
import { useMessage } from '../../feature/setting/use-message';
import { BrowseShell } from '../../shared/ui/browse-shell';
import { NavItem, NavList } from '../../shared/ui/nav-list';
import { TEXT_CLASS } from '../../shared/ui/text-class';

const CATEGORY_NAV: readonly { category: SettingCategory; icon: LucideIcon }[] = [
  { category: 'appearance', icon: SunMoon },
  { category: 'playback', icon: MonitorPlay },
  { category: 'language', icon: Languages },
];

export function SettingPage({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState<SettingCategory>('appearance');
  const message = useMessage();
  const navEntries = CATEGORY_NAV.map(({ category: navCategory, icon }) => ({
    value: navCategory,
    icon,
    label: message.setting.category[navCategory],
  }));

  return (
    <BrowseShell
      sidebar={(
        <>
          <NavItem icon={ChevronLeft} label={message.common.back} onClick={onBack} />
          <p className={`px-3 pb-2 pt-5 ${TEXT_CLASS.groupLabel}`}>{message.common.setting}</p>
          <NavList label={message.common.setting} entries={navEntries} currentValue={category} onSelect={setCategory} />
        </>
      )}
    >
      <SettingPanel category={category} />
    </BrowseShell>
  );
}
