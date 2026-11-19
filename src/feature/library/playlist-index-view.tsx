import { useState } from 'react';
import type { Playlist, VideoEntry } from '../../shared/contract/mudio-contract';
import { EmptyState } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { useMessage } from '../setting/use-message';
import { CardGrid } from './card-grid';
import { PlaylistCard } from './playlist-card';
import { PlaylistDetailView } from './playlist-detail-view';
import { useVideoLibrary } from './video-library-context';

interface PlaylistIndexViewProps {
  onPlayPlaylist: (playlist: Playlist, startVideoId: string) => void;
}

export function PlaylistIndexView({ onPlayPlaylist }: PlaylistIndexViewProps) {
  const { playlists, findVideo } = useVideoLibrary();
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  // Looked up on every render, so a playlist deleted meanwhile drops back to the index.
  const openPlaylist = playlists.find(playlist => playlist.id === openPlaylistId);
  const libraryMessage = useMessage().library;

  if (openPlaylist) {
    return (
      <PlaylistDetailView
        playlist={openPlaylist}
        onBack={() => setOpenPlaylistId(null)}
        onPlayPlaylist={onPlayPlaylist}
      />
    );
  }

  return (
    <>
      <PageHeader title={libraryMessage.sectionTitle.playlist} description={libraryMessage.playlistCount(playlists.length)} />
      {playlists.length === 0 ? (
        <div className="flex-1">
          <EmptyState title={libraryMessage.emptyTitle.playlist} hint={libraryMessage.emptyPlaylistHint} />
        </div>
      ) : (
        <CardGrid>
          {playlists.map(playlist => (
            <li key={playlist.id}>
              <PlaylistCard
                title={playlist.title}
                videos={playlist.videoIds.map(findVideo).filter((video): video is VideoEntry => video !== undefined)}
                onOpen={() => setOpenPlaylistId(playlist.id)}
              />
            </li>
          ))}
        </CardGrid>
      )}
    </>
  );
}
