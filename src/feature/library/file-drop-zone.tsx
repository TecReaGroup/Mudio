import { Upload } from 'lucide-react';
import { useState, type DragEvent, type ReactNode } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { useMessage } from '../setting/use-message';

function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes('Files');
}

interface FileDropZoneProps {
  onImported: (videos: VideoEntry[]) => void;
  children: ReactNode;
}

/** Accepts dropped video files and folders anywhere inside, importing them into the library. */
export function FileDropZone({ onImported, children }: FileDropZoneProps) {
  // Counter, because dragenter/dragleave also fire when crossing child elements.
  const [dragDepth, setDragDepth] = useState(0);
  const message = useMessage().library;

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragDepth(0);
    const paths = [...event.dataTransfer.files].map(file => mudio.pathForFile(file)).filter(Boolean);
    if (paths.length === 0) return;
    mudio.library.importPaths(paths)
      .then(videos => {
        if (videos.length > 0) onImported(videos);
        else log('info', 'Library', 'Dropped items contained no supported videos');
      })
      .catch(error => log('error', 'Library', `Import dropped files failed: ${describeError(error)}`));
  };

  return (
    <div
      className="relative h-full"
      onDragEnter={event => carriesFiles(event) && setDragDepth(depth => depth + 1)}
      onDragLeave={event => carriesFiles(event) && setDragDepth(depth => Math.max(0, depth - 1))}
      onDragOver={event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handleDrop}
    >
      {children}
      {dragDepth > 0 && (
        <div className="pointer-events-none absolute inset-2 z-(--layer-overlay) flex animate-overlay-in flex-col items-center justify-center gap-3 rounded-dialog border-2 border-dashed border-accent bg-surface/85 backdrop-blur-sm">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Upload aria-hidden className="size-5" />
          </span>
          <p className={TEXT_CLASS.label}>{message.dropToOpen}</p>
        </div>
      )}
    </div>
  );
}
