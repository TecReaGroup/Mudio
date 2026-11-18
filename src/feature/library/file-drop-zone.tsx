import { Upload } from 'lucide-react';
import { useState, type DragEvent, type ReactNode } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';

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
        <div className="pointer-events-none absolute inset-3 z-50 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-background/85 backdrop-blur-sm">
          <Upload className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium">松开以打开视频</p>
        </div>
      )}
    </div>
  );
}
