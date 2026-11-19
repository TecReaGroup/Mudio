import { Folder } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { mudio } from '../../shared/api/mudio';
import type { LibraryFolder } from '../../shared/contract/mudio-contract';
import { formatFileSize } from '../../shared/lib/format';
import { describeError, log } from '../../shared/lib/logger';
import { cn } from '../../shared/lib/cn';
import { Button } from '../../shared/ui/button';
import { Modal } from '../../shared/ui/modal';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { PlaylistPicker } from '../library/playlist-picker';
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
  const save = (event: FormEvent) => {
    event.preventDefault();
    mudio.libraryFolder.editPlaylists(folder.path, playlistTitles)
      .catch(error => log('error', 'LibraryFolder', `Edit folder playlists failed: ${describeError(error)}`));
    onClose();
  };

  return (
    <Modal
      title={folderMessage.editDialogTitle}
      closeLabel={message.common.close}
      onClose={onClose}
      // Visible overflow lets the playlist dropdown float past the dialog's bottom edge.
      layoutClassName="w-[min(30rem,calc(100vw-2rem))] overflow-visible"
    >
      <form onSubmit={save}>
        <div className="space-y-6 px-5 pb-8 pt-1">
          <div className="flex items-center gap-4 rounded-card border border-line-subtle p-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <Folder aria-hidden className="size-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p title={folder.path} className={cn('line-clamp-2 wrap-anywhere', TEXT_CLASS.meta)}>{folder.path}</p>
              <p className={TEXT_CLASS.hint}>
                {message.library.videoCount(folder.videoIds.length)} · {formatFileSize(totalBytes)}
              </p>
            </div>
          </div>
          <PlaylistPicker
            selectedTitles={playlistTitles}
            lockedTitles={[]}
            existingTitles={playlists.map(playlist => playlist.title)}
            description={folderMessage.editPlaylistHint}
            onChange={setPlaylistTitles}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line-subtle px-5 py-4">
          <Button onClick={onClose}>{message.common.cancel}</Button>
          <Button type="submit" tone="primary">{message.library.edit.save}</Button>
        </div>
      </form>
    </Modal>
  );
}
