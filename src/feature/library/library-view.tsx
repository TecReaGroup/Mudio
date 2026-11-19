import { useDeferredValue, useMemo, useState } from 'react';
import { SUPPORTED_VIDEO_EXTENSIONS } from '../../shared/contract/mudio-contract';
import { moveItem } from '../../shared/lib/order';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorBanner } from '../../shared/ui/feedback';
import { PageHeader } from '../../shared/ui/page-header';
import { SortableScope } from '../../shared/ui/sortable';
import { useMessage } from '../setting/use-message';
import { CardGrid } from './card-grid';
import { ImportFolderButton } from './import-folder-button';
import type { VideoCollection } from './library-section';
import { VideoCard } from './video-card';
import { VideoEditDialog } from './video-edit-dialog';
import { useVideoLibrary } from './video-library-context';

const SUPPORTED_FORMAT_HINT = SUPPORTED_VIDEO_EXTENSIONS.map(extension => `.${extension}`).join('  ');

interface LibraryViewProps {
  collection: VideoCollection;
  searchQuery: string;
  onClearSearch: () => void;
  onPlay: (videoId: string) => void;
}

export function LibraryView({ collection, searchQuery, onClearSearch, onPlay }: LibraryViewProps) {
  const { videos, recentVideos, findVideo, arrangeVideos, arrangeRecent, removeFromRecent, loadError } = useVideoLibrary();
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  // Looked up on every render, so the dialog closes itself if the video is removed meanwhile.
  const editingVideo = editingVideoId === null ? undefined : findVideo(editingVideoId);
  const message = useMessage();
  const libraryMessage = message.library;
  const orderedVideos = collection === 'all' ? videos : recentVideos;
  // The input updates immediately; filtering a large grid follows at lower priority so typing never stalls.
  const trimmedQuery = useDeferredValue(searchQuery).trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const collectionVideos = useMemo(
    () => orderedVideos.filter(video => video.title.toLowerCase().includes(normalizedQuery)),
    [orderedVideos, normalizedQuery],
  );

  // Moves within the whole collection, so dragging inside search results keeps hidden videos in place.
  const moveVideo = (movedId: string, targetId: string) => {
    const arrange = collection === 'all' ? arrangeVideos : arrangeRecent;
    arrange(moveItem(orderedVideos.map(video => video.id), movedId, targetId));
  };

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
      />
      {collectionVideos.length === 0 ? (
        <div className="flex-1">{renderEmptyState()}</div>
      ) : (
        // Keyed so switching collections replays the fade-in.
        <SortableScope itemIds={collectionVideos.map(video => video.id)} onMove={moveVideo}>
          <CardGrid key={collection}>
            {collectionVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={onPlay}
                onEdit={setEditingVideoId}
                onRemoveFromRecent={collection === 'recent' ? removeFromRecent : undefined}
              />
            ))}
          </CardGrid>
        </SortableScope>
      )}
      {editingVideo && <VideoEditDialog video={editingVideo} onClose={() => setEditingVideoId(null)} />}
    </>
  );
}
