import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { mudio } from '../../shared/api/mudio';
import { describeError, log } from '../../shared/lib/logger';
import { Button } from '../../shared/ui/button';
import type { ButtonTone, ControlSize } from '../../shared/ui/control-class';
import { Spinner } from '../../shared/ui/feedback';
import { useMessage } from '../setting/use-message';

interface ImportFolderButtonProps {
  tone: ButtonTone;
  size: ControlSize;
}

/** Stays disabled with a spinner while the picker is open and the folder is being scanned. */
export function ImportFolderButton({ tone, size }: ImportFolderButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const label = useMessage().library.importFolder;

  const importFolder = () => {
    setIsImporting(true);
    mudio.library.pickAndImportFolder()
      .catch(error => log('error', 'Library', `Import folder failed: ${describeError(error)}`))
      .finally(() => setIsImporting(false));
  };

  return (
    <Button tone={tone} size={size} disabled={isImporting} aria-busy={isImporting} onClick={importFolder}>
      {isImporting ? <Spinner /> : <FolderPlus aria-hidden />}
      {label}
    </Button>
  );
}
