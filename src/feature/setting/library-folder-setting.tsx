import { Folder, FolderPlus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { mudio } from '../../shared/api/mudio';
import { FOLDER_SCAN_MAX_DEPTH } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';
import { Button, IconButton } from '../../shared/ui/button';
import { Spinner } from '../../shared/ui/feedback';
import { ConfirmDeleteDialog } from '../../shared/ui/modal';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { SettingRow } from './setting-row';
import { useMessage } from './use-message';

/** Folders the library keeps in sync with. Scanning runs in the main process; new videos arrive via library pushes. */
export function LibraryFolderSetting() {
  const message = useMessage();
  const folderMessage = message.setting.libraryFolder;
  // null until loaded, so the empty hint never flashes before the real list.
  const [folders, setFolders] = useState<string[] | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [folderToRemove, setFolderToRemove] = useState<string | null>(null);
  const isBusy = isAdding || isRescanning;

  useEffect(() => {
    mudio.libraryFolder.list()
      .then(setFolders)
      .catch(error => log('error', 'LibraryFolder', `Failed to load folders: ${describeError(error)}`));
  }, []);

  const addFolder = () => {
    setIsAdding(true);
    mudio.libraryFolder.pickAndAdd()
      .then(setFolders)
      .catch(error => log('error', 'LibraryFolder', `Add folder failed: ${describeError(error)}`))
      .finally(() => setIsAdding(false));
  };

  const rescanFolders = () => {
    setIsRescanning(true);
    mudio.libraryFolder.rescan()
      .catch(error => log('error', 'LibraryFolder', `Rescan failed: ${describeError(error)}`))
      .finally(() => setIsRescanning(false));
  };

  const removeFolder = (folderPath: string) => {
    mudio.libraryFolder.remove(folderPath)
      .then(setFolders)
      .catch(error => log('error', 'LibraryFolder', `Remove folder failed: ${describeError(error)}`));
  };

  if (!folders) return null;
  return (
    <>
      <SettingRow title={folderMessage.title} description={folderMessage.description(FOLDER_SCAN_MAX_DEPTH)}>
        <div className="flex shrink-0 items-center gap-2">
          <Button disabled={isBusy || folders.length === 0} aria-busy={isRescanning} onClick={rescanFolders}>
            {isRescanning ? <Spinner /> : <RefreshCw aria-hidden />}
            {folderMessage.rescan}
          </Button>
          <Button tone="primary" disabled={isBusy} aria-busy={isAdding} onClick={addFolder}>
            {isAdding ? <Spinner /> : <FolderPlus aria-hidden />}
            {folderMessage.add}
          </Button>
        </div>
      </SettingRow>
      {folders.length === 0 ? (
        <p className={`px-5 py-4 ${TEXT_CLASS.hint}`}>{folderMessage.empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {folders.map(folderPath => (
            <li key={folderPath} className="flex items-center gap-3 py-2.5 pl-5 pr-3">
              <Folder aria-hidden className="size-4 shrink-0 text-subtle" />
              <span title={folderPath} className={`min-w-0 flex-1 truncate ${TEXT_CLASS.body}`}>{folderPath}</span>
              <IconButton tone="quietDanger" label={folderMessage.remove} onClick={() => setFolderToRemove(folderPath)}>
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {folderToRemove && (
        <ConfirmDeleteDialog
          title={folderMessage.removeConfirmTitle}
          description={folderMessage.removeConfirmDescription(folderToRemove)}
          cancelLabel={message.common.cancel}
          confirmLabel={folderMessage.removeConfirm}
          closeLabel={message.common.close}
          onConfirm={() => removeFolder(folderToRemove)}
          onClose={() => setFolderToRemove(null)}
        />
      )}
    </>
  );
}
