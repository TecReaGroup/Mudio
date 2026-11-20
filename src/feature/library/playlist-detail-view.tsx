import { useCallback, useEffect, useRef, useState } from 'react';
import type { Playlist, VideoEntry } from '../../shared/contract/mudio-contract';
import { moveItem } from '../../shared/lib/order';
import { BackButton } from '../../shared/ui/back-button';
import { EmptyState } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { SortableScope } from '../../shared/ui/sortable';
import { useMessage } from '../setting/use-message';
import { CardGrid } from './card-grid';
import { VideoCard } from './video-card';
import { VideoEditDialog } from './video-edit-dialog';
import { useVideoLibrary } from './video-library-context';

interface PlaylistDetailViewProps {
  playlist: Playlist;
  onBack: () => void;
  onPlayPlaylist: (playlist: Playlist, startVideoId: string) => void;
}

export function PlaylistDetailView({ playlist, onBack, onPlayPlaylist }: PlaylistDetailViewProps) {
  const { findVideo, arrangePlaylist } = useVideoLibrary();
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const editingVideo = editingVideoId === null ? undefined : findVideo(editingVideoId);
  const message = useMessage();
  const libraryMessage = message.library;
  const playlistVideos = playlist.videoIds.map(findVideo).filter((video): video is VideoEntry => video !== undefined);

  // Every library push brings a fresh playlist object; reading it at click time keeps the card callback stable.
  const latestPlaylist = useRef(playlist);
  useEffect(() => {
    latestPlaylist.current = playlist;
  });
  const playFrom = useCallback(
    (videoId: string) => onPlayPlaylist(latestPlaylist.current, videoId),
    [onPlayPlaylist],
  );

  return (
    <>
      <PageHeader
        title={playlist.title}
        description={libraryMessage.videoCount(playlistVideos.length)}
        leading={<BackButton label={message.common.back} onBack={onBack} />}
      />
      {playlistVideos.length === 0 ? (
        <div className="flex-1">
          <EmptyState title={libraryMessage.emptyTitle.playlistVideo} hint={libraryMessage.emptyPlaylistHint} />
        </div>
      ) : (
        <SortableScope
          itemIds={playlistVideos.map(video => video.id)}
          onMove={(movedId, targetId) => arrangePlaylist(playlist.id, moveItem(playlist.videoIds, movedId, targetId))}
        >
          <CardGrid>
            {playlistVideos.map(video => (
              <VideoCard key={video.id} video={video} onPlay={playFrom} onEdit={setEditingVideoId} />
            ))}
          </CardGrid>
        </SortableScope>
      )}
      {editingVideo && <VideoEditDialog video={editingVideo} onClose={() => setEditingVideoId(null)} />}
    </>
  );
}
