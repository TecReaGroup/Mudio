import { PageHeader } from '../../shared/ui/page-header';
import { useMessage } from '../setting/use-message';
import { CardGrid } from './card-grid';
import { PLAYLISTS, selectCollectionVideos, type Playlist } from './library-section';
import { PlaylistCard } from './playlist-card';
import { useVideoLibrary } from './video-library-context';

interface PlaylistIndexViewProps {
  onOpenPlaylist: (playlist: Playlist) => void;
}

export function PlaylistIndexView({ onOpenPlaylist }: PlaylistIndexViewProps) {
  const { videos } = useVideoLibrary();
  const libraryMessage = useMessage().library;

  return (
    <>
      <PageHeader title={libraryMessage.sectionTitle.playlist} description={libraryMessage.playlistCount(PLAYLISTS.length)} />
      <CardGrid>
        {PLAYLISTS.map(playlist => (
          <li key={playlist}>
            <PlaylistCard
              title={libraryMessage.sectionTitle[playlist]}
              videos={selectCollectionVideos(videos, playlist)}
              onOpen={() => onOpenPlaylist(playlist)}
            />
          </li>
        ))}
      </CardGrid>
    </>
  );
}
