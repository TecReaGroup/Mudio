import { useId, useState } from 'react';
import type { VideoEntry } from '../../shared/contract/mudio-contract';
import { cn } from '../../shared/lib/cn';
import { DIALOG_TEXT_FIELD_CLASS } from '../../shared/ui/control-class';
import { DialogSubject, FormDialog } from '../../shared/ui/modal';
import { TEXT_CLASS } from '../../shared/ui/text-class';
import { useMessage } from '../setting/use-message';
import { PICKER_HOST_DIALOG_CLASS, PlaylistPicker } from './playlist-picker';
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

  return (
    <FormDialog
      title={editMessage.dialogTitle}
      closeLabel={message.common.close}
      cancelLabel={message.common.cancel}
      submitLabel={editMessage.save}
      submitDisabled={!trimmedTitle}
      onSubmit={() => editVideo(video.id, { title: trimmedTitle, playlistTitles })}
      onClose={onClose}
      layoutClassName={PICKER_HOST_DIALOG_CLASS}
    >
      <DialogSubject
        visual={(
          <div className="aspect-video w-36 shrink-0 overflow-hidden rounded-control bg-sunken">
            <VideoCover video={video} />
          </div>
        )}
        label={video.filePath}
        meta={describeVideoFile(video)}
      />
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
    </FormDialog>
  );
}
