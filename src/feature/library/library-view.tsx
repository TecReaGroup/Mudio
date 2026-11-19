import { ChevronLeft } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { SUPPORTED_VIDEO_EXTENSIONS } from '../../shared/contract/mudio-contract';
import { Button, IconButton } from '../../shared/ui/button';
import { EmptyState, ErrorBanner } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { useMessage } from '../setting/use-message';
import { CardGrid } from './card-grid';
import { ImportFolderButton } from './import-folder-button';
import { selectCollectionVideos, type VideoCollection } from './library-section';
import { VideoCard } from './video-card';
import { useVideoLibrary } from './video-library-context';

const SUPPORTED_FORMAT_HINT = SUPPORTED_VIDEO_EXTENSIONS.map(extension => `.${extension}`).join('  ');

interface LibraryViewProps {
  collection: VideoCollection;
  searchQuery: string;
  /** Shows a back button before the title, for collections opened from another page. */
  onBack?: () => void;
  onClearSearch: () => void;
  /** playlistIds is the order the player should follow. */
  onPlay: (videoId: string, playlistIds: string[]) => void;
}

export function LibraryView({ collection, searchQuery, onBack, onClearSearch, onPlay }: LibraryViewProps) {
  const { videos, loadError } = useVideoLibrary();
  const message = useMessage();
  const libraryMessage = message.library;
  // The input updates immediately; filtering a large grid follows at lower priority so typing never stalls.
  const trimmedQuery = useDeferredValue(searchQuery).trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const collectionVideos = useMemo(
    () => selectCollectionVideos(videos, collection).filter(video => video.title.toLowerCase().includes(normalizedQuery)),
    [videos, collection, normalizedQuery],
  );

  // Read at click time, so the callback stays stable and memoized cards survive every library push.
  const latestCollectionVideos = useRef(collectionVideos);
  useEffect(() => {
    latestCollectionVideos.current = collectionVideos;
  });
  const playFromCollection = useCallback(
    (videoId: string) => onPlay(videoId, latestCollectionVideos.current.map(video => video.id)),
    [onPlay],
  );

  const renderEmptyState = () => {
    if (trimmedQuery) {
      return (
        <EmptyState
          title={libraryMessage.noMatch(trimmedQuery)}
          hint={libraryMessage.noMatchHint}
          action={<Button onClick={onClearSearch}>{libraryMessage.clearSearch}</Button>}
        />
      );
    }
    if (collection === 'recent') {
      return <EmptyState title={libraryMessage.emptyTitle.recent} hint={libraryMessage.emptyRecentHint} />;
    }
    return (
      <EmptyState
        title={libraryMessage.emptyTitle.all}
        hint={libraryMessage.emptyLibraryHint(SUPPORTED_FORMAT_HINT)}
        action={<ImportFolderButton tone="secondary" size="md" />}
      />
    );
  };

  return (
    <>
      {loadError && <ErrorBanner message={libraryMessage.loadFailed} detail={loadError} />}
      <PageHeader
        title={libraryMessage.sectionTitle[collection]}
        description={libraryMessage.videoCount(collectionVideos.length)}
        leading={onBack && (
          <IconButton label={message.common.back} onClick={onBack}>
            <ChevronLeft />
          </IconButton>
        )}
      />
      {collectionVideos.length === 0 ? (
        <div className="flex-1">{renderEmptyState()}</div>
      ) : (
        // Keyed so switching collections replays the fade-in.
        <CardGrid key={collection}>
          {collectionVideos.map(video => (
            <li key={video.id}>
              <VideoCard video={video} onPlay={playFromCollection} />
            </li>
          ))}
        </CardGrid>
      )}
    </>
  );
}
