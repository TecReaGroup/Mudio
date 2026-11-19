import type { ReactNode } from 'react';
import { TEXT_CLASS } from '../../shared/ui/text-class';

export function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className={TEXT_CLASS.label}>{title}</p>
        <p className={`mt-1 ${TEXT_CLASS.meta}`}>{description}</p>
      </div>
      {children}
    </div>
  );
}
