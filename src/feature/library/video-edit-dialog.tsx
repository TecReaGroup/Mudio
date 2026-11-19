import { useId, useState, type FormEvent } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { Button } from '../../shared/ui/button';
import { TEXT_FIELD_CLASS } from '../../shared/ui/control-class';
import { Modal } from '../../shared/ui/modal';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { useMessage } from '../setting/use-message';
import { PlaylistPicker } from './playlist-picker';
import { useVideoLibrary } from './video-library-context';

interface VideoEditDialogProps {
  video: VideoEntry;
  onClose: () => void;
}

/** Edits the title (the embedded one, or the file name when there was none) and the video's playlists. */
export function VideoEditDialog({ video, onClose }: VideoEditDialogProps) {
  const { playlists, editVideo } = useVideoLibrary();
  const message = useMessage();
  const editMessage = message.library.edit;
  const titleInputId = useId();
  const [title, setTitle] = useState(video.title);
  const [playlistTitles, setPlaylistTitles] = useState(
    () => playlists.filter(playlist => playlist.videoIds.includes(video.id)).map(playlist => playlist.title),
  );
  const trimmedTitle = title.trim();

  const save = (event: FormEvent) => {
    event.preventDefault();
    editVideo(video.id, { title: trimmedTitle, playlistTitles });
    onClose();
  };

  return (
    <Modal title={editMessage.dialogTitle} description={video.filePath} closeLabel={message.common.close} onClose={onClose}>
      <form onSubmit={save}>
        <div className="space-y-4 px-5 pb-5">
          <div>
            <label htmlFor={titleInputId} className={TEXT_CLASS.label}>{editMessage.title}</label>
            <input
              id={titleInputId}
              autoFocus
              value={title}
              onChange={event => setTitle(event.target.value)}
              className={cn('mt-1.5 h-9 w-full', TEXT_FIELD_CLASS)}
            />
          </div>
          <PlaylistPicker
            selectedTitles={playlistTitles}
            existingTitles={playlists.map(playlist => playlist.title)}
            onChange={setPlaylistTitles}
          />
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button onClick={onClose}>{message.common.cancel}</Button>
          <Button type="submit" tone="primary" disabled={!trimmedTitle}>{editMessage.save}</Button>
        </div>
      </form>
    </Modal>
  );
}
