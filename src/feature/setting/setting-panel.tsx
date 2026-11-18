import type { ReactNode } from 'react';
import type { ThemePreference } from '../../shared/contract/mudio-contract';
import { PageHeader } from '../../shared/ui/page-header';
import { SegmentedControl } from '../../shared/ui/segmented-control';
import { Switch } from '../../shared/ui/switch';
import { useSetting } from './setting-context';

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-medium text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border rounded-xl border border-border">{children}</div>
    </section>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingPanel() {
  const { setting, updateSetting } = useSetting();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="设置" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
          <SettingGroup title="外观">
            <SettingRow title="主题" description="选择界面的配色方案">
              <SegmentedControl options={THEME_OPTIONS} value={setting.theme} onValueChange={theme => updateSetting({ theme })} />
            </SettingRow>
          </SettingGroup>
          <SettingGroup title="播放">
            <SettingRow title="自动播放下一个" description="当前视频结束后播放列表中的下一个视频">
              <Switch
                label="自动播放下一个"
                checked={setting.autoplayNext}
                onCheckedChange={autoplayNext => updateSetting({ autoplayNext })}
              />
            </SettingRow>
            <SettingRow title="记住播放进度" description="再次打开视频时从上次的位置继续">
              <Switch
                label="记住播放进度"
                checked={setting.resumePlayback}
                onCheckedChange={resumePlayback => updateSetting({ resumePlayback })}
              />
            </SettingRow>
          </SettingGroup>
        </div>
      </div>
    </div>
  );
}
