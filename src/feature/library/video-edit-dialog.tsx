import { useId, useState, type FormEvent } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { Button } from '../../shared/ui/button';
import { DIALOG_TEXT_FIELD_CLASS } from '../../shared/ui/control-class';
import { Modal } from '../../shared/ui/modal';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { useMessage } from '../setting/use-message';
import { PlaylistPicker } from './playlist-picker';
import { describeVideoFile } from './video-file-meta';
import { VideoCover } from './video-thumbnail';
import { useVideoLibrary } from './video-library-context';

interface VideoEditDialogProps {
  video: VideoEntry;
  onClose: () => void;
}

/** Edits the title (the embedded one, or the file name when there was none) and the video's playlists. */
export function VideoEditDialog({ video, onClose }: VideoEditDialogProps) {
  const { playlists, folders, editVideo } = useVideoLibrary();
  const message = useMessage();
  const editMessage = message.library.edit;
  const titleInputId = useId();
  const [title, setTitle] = useState(video.title);
  const [playlistTitles, setPlaylistTitles] = useState(
    () => playlists.filter(playlist => playlist.videoIds.includes(video.id)).map(playlist => playlist.title),
  );
  const trimmedTitle = title.trim();
  const folderPlaylistTitles = [...new Set(folders
    .filter(folder => folder.videoIds.includes(video.id))
    .flatMap(folder => folder.playlistTitles))];

  const save = (event: FormEvent) => {
    event.preventDefault();
    editVideo(video.id, { title: trimmedTitle, playlistTitles });
    onClose();
  };

  return (
    <Modal
      title={editMessage.dialogTitle}
      closeLabel={message.common.close}
      onClose={onClose}
      // Visible overflow lets the playlist dropdown float past the dialog's bottom edge.
      layoutClassName="w-[min(30rem,calc(100vw-2rem))] overflow-visible"
    >
      <form onSubmit={save}>
        <div className="space-y-6 px-5 pb-8 pt-1">
          <div className="flex items-center gap-4 rounded-card border border-line-subtle p-3">
            <div className="aspect-video w-36 shrink-0 overflow-hidden rounded-control bg-sunken">
              <VideoCover video={video} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p title={video.filePath} className={cn('line-clamp-2 wrap-anywhere', TEXT_CLASS.meta)}>{video.filePath}</p>
              <p className={TEXT_CLASS.hint}>{describeVideoFile(video)}</p>
            </div>
          </div>
          <div>
            <label htmlFor={titleInputId} className={TEXT_CLASS.label}>{editMessage.title}</label>
            <input
              id={titleInputId}
              autoFocus
              value={title}
              onChange={event => setTitle(event.target.value)}
              className={cn('mt-2 h-10 w-full', DIALOG_TEXT_FIELD_CLASS)}
            />
          </div>
          <PlaylistPicker
            selectedTitles={playlistTitles}
            lockedTitles={folderPlaylistTitles}
            existingTitles={playlists.map(playlist => playlist.title)}
            onChange={setPlaylistTitles}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line-subtle px-5 py-4">
          <Button onClick={onClose}>{message.common.cancel}</Button>
          <Button type="submit" tone="primary" disabled={!trimmedTitle}>{editMessage.save}</Button>
        </div>
      </form>
    </Modal>
  );
}
