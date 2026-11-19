import { EmptyState } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { useMessage } from '../setting/use-message';

// TODO: List user playlists here once they exist; Recent now has its own nav entry.
export function PlaylistIndexView() {
  const libraryMessage = useMessage().library;

  return (
    <>
      <PageHeader title={libraryMessage.sectionTitle.playlist} description={libraryMessage.playlistCount(0)} />
      <div className="flex-1">
        <EmptyState title={libraryMessage.emptyTitle.playlist} />
      </div>
    </>
  );
}
