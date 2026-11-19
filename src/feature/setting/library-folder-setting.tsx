import { Folder, FolderPlus, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { mudio } from '../../shared/api/mudio';
import { FOLDER_SCAN_MAX_DEPTH, type LibraryFolder } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';
import { Button, IconButton } from '../../shared/ui/button';
import { Spinner } from '../../shared/ui/feedback';
import { ConfirmDeleteDialog } from '../../shared/ui/modal';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { useVideoLibrary } from '../library/video-library-context';
import { FolderEditDialog } from './folder-edit-dialog';
import { SettingRow } from './setting-row';
import { useMessage } from './use-message';

/** Folders the library keeps in sync with. Scanning runs in the main process; folders and videos arrive via library pushes. */
export function LibraryFolderSetting() {
  const message = useMessage();
  const folderMessage = message.setting.libraryFolder;
  const { folders } = useVideoLibrary();
  const [isAdding, setIsAdding] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<LibraryFolder | null>(null);
  const [folderToRemove, setFolderToRemove] = useState<string | null>(null);
  const isBusy = isAdding || isRescanning;

  const addFolder = () => {
    setIsAdding(true);
    mudio.libraryFolder.pickAndAdd()
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
      .catch(error => log('error', 'LibraryFolder', `Remove folder failed: ${describeError(error)}`));
  };

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
          {folders.map(folder => (
            <li key={folder.path} className="flex items-center gap-3 py-2.5 pl-5 pr-3">
              <Folder aria-hidden className="size-4 shrink-0 text-subtle" />
              <span title={folder.path} className={`min-w-0 flex-1 truncate ${TEXT_CLASS.body}`}>{folder.path}</span>
              <IconButton label={folderMessage.edit} onClick={() => setFolderToEdit(folder)}>
                <Pencil />
              </IconButton>
              <IconButton tone="quietDanger" label={folderMessage.remove} onClick={() => setFolderToRemove(folder.path)}>
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {folderToEdit && <FolderEditDialog folder={folderToEdit} onClose={() => setFolderToEdit(null)} />}
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
