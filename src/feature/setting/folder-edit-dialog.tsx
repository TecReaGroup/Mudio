import { Folder } from 'lucide-react';
import { useState } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { LibraryFolder } from '../../shared/contract/mudio-contract';
import { formatFileSize } from '../../shared/lib/format';
import { describeError, log } from '../../shared/lib/logger';
import { DialogSubject, FormDialog } from '../../shared/ui/modal';
import { PICKER_HOST_DIALOG_CLASS, PlaylistPicker } from '../library/playlist-picker';
import { useVideoLibrary } from '../library/video-library-context';
import { useMessage } from './use-message';

interface FolderEditDialogProps {
  folder: LibraryFolder;
  onClose: () => void;
}

/** Sets the playlists every video under a library folder belongs to; single videos are edited from the library. */
export function FolderEditDialog({ folder, onClose }: FolderEditDialogProps) {
  const { playlists, findVideo } = useVideoLibrary();
  const message = useMessage();
  const folderMessage = message.setting.libraryFolder;
  const [playlistTitles, setPlaylistTitles] = useState(folder.playlistTitles);
  const totalBytes = folder.videoIds.reduce((sum, videoId) => sum + (findVideo(videoId)?.sizeBytes ?? 0), 0);

  // Not optimistic: the dialog has already closed, and main's push arrives within milliseconds.
  const savePlaylists = () => {
    mudio.libraryFolder.editPlaylists(folder.path, playlistTitles)
      .catch(error => log('error', 'LibraryFolder', `Edit folder playlists failed: ${describeError(error)}`));
  };

  return (
    <FormDialog
      title={folderMessage.editDialogTitle}
      closeLabel={message.common.close}
      cancelLabel={message.common.cancel}
      submitLabel={message.library.edit.save}
      onSubmit={savePlaylists}
      onClose={onClose}
      layoutClassName={PICKER_HOST_DIALOG_CLASS}
    >
      <DialogSubject
        visual={(
          <div className="flex size-12 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
            <Folder aria-hidden className="size-6" strokeWidth={1.75} />
          </div>
        )}
        label={folder.path}
        meta={`${message.library.videoCount(folder.videoIds.length)} · ${formatFileSize(totalBytes)}`}
      />
      <PlaylistPicker
        selectedTitles={playlistTitles}
        lockedTitles={[]}
        existingTitles={playlists.map(playlist => playlist.title)}
        description={folderMessage.editPlaylistHint}
        onChange={setPlaylistTitles}
      />
    </FormDialog>
  );
}
