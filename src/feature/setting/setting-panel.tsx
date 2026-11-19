import type { ReactNode } from 'react';
import type { Language } from '../../shared/contract/mudio-contract';
import { mudio } from '../../shared/api/mudio';
import { Button } from '../../shared/ui/button';
import { SURFACE_CLASS } from '../../shared/ui/control-class';
import { PageHeader } from '../../shared/ui/page-header';
import { SegmentedControl } from '../../shared/ui/segmented-control';
import { Switch } from '../../shared/ui/switch';
import { LibraryFolderSetting } from './library-folder-setting';
import { useSetting } from './setting-context';
import { SettingRow } from './setting-row';
import { useMessage } from './use-message';

// Each language is labeled in itself so users can find theirs regardless of the current language.
const LANGUAGE_OPTIONS: readonly { value: Language; label: string }[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
];

export type SettingCategory = 'general' | 'language' | 'libraryFolder';

function ResumePlaybackSetting() {
  const { setting, updateSetting } = useSetting();
  const message = useMessage().setting;

  return (
    <SettingRow title={message.resumePlayback} description={message.resumePlaybackDescription}>
      <Switch
        label={message.resumePlayback}
        checked={setting.resumePlayback}
        onCheckedChange={resumePlayback => updateSetting({ resumePlayback })}
      />
    </SettingRow>
  );
}

function DefaultPlayerSetting() {
  const message = useMessage().setting;

  return (
    <SettingRow title={message.defaultPlayer} description={message.defaultPlayerDescription}>
      <Button layoutClassName="shrink-0" onClick={() => void mudio.defaultPlayer.openSetting()}>
        {message.defaultPlayerOpen}
      </Button>
    </SettingRow>
  );
}

function GeneralSetting() {
  return (
    <>
      <ResumePlaybackSetting />
      {mudio.platform === 'win32' && <DefaultPlayerSetting />}
    </>
  );
}

function LanguageSetting() {
  const { setting, updateSetting } = useSetting();
  const message = useMessage().setting;

  return (
    <SettingRow title={message.language} description={message.languageDescription}>
      <SegmentedControl
        label={message.language}
        options={LANGUAGE_OPTIONS}
        value={setting.language}
        onValueChange={language => updateSetting({ language })}
      />
    </SettingRow>
  );
}

const CATEGORY_CONTENT: Record<SettingCategory, () => ReactNode> = {
  general: GeneralSetting,
  language: LanguageSetting,
  libraryFolder: LibraryFolderSetting,
};

/** Every change saves immediately; there is no submit step. */
export function SettingPanel({ category }: { category: SettingCategory }) {
  const categoryLabel = useMessage().setting.category;
  const CategoryContent = CATEGORY_CONTENT[category];

  return (
    <div key={category} className="max-w-2xl animate-fade-in">
      <PageHeader title={categoryLabel[category]} />
      <div className={`divide-y divide-line ${SURFACE_CLASS}`}>
        <CategoryContent />
      </div>
    </div>
  );
}
