import type { ReactNode } from 'react';
import { MEDIA_GLASS_CLASS } from '../../shared/ui/control-class';

/**
 * Panel floating above a control bar trigger, opened by hovering or focusing the trigger.
 * The panel's bottom padding bridges the gap to the trigger so the pointer can travel between them
 * without the hover dropping.
 */
export function ControlPopover({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <div className="group/popover relative flex">
      {trigger}
      <div className="invisible absolute bottom-full left-1/2 z-(--layer-dropdown) -translate-x-1/2 translate-y-1 pb-2 opacity-0 transition-[opacity,translate,visibility] duration-medium group-focus-within/popover:visible group-focus-within/popover:translate-y-0 group-focus-within/popover:opacity-100 group-hover/popover:visible group-hover/popover:translate-y-0 group-hover/popover:opacity-100">
        <div className={`rounded-card p-1.5 ${MEDIA_GLASS_CLASS}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
