import { FilePlus2, FolderPlus, Clapperboard } from 'lucide-react';
import { mudio } from '../../shared/api/mudio';
import { SUPPORTED_VIDEO_EXTENSIONS } from '../../shared/contract/mudio-contract';
import { describeError, log } from '../../shared/lib/logger';
import { Button } from '../../shared/ui/button';
import { PageHeader } from '../../shared/ui/page-header';
import { LIBRARY_SECTION_TITLE, selectSectionVideos, type LibrarySection } from './library-section';
import { VideoCard } from './video-card';
import { useVideoLibrary } from './video-library-context';

const SUPPORTED_FORMAT_HINT = SUPPORTED_VIDEO_EXTENSIONS.map(extension => `.${extension}`).join('  ');

const EMPTY_MESSAGE: Record<LibrarySection, string> = {
  all: '拖拽视频文件到窗口，或点击「打开文件」开始播放',
  recent: '还没有播放记录',
};

interface LibraryViewProps {
  section: LibrarySection;
  /** playlistIds is the order the player should follow. */
  onPlay: (videoId: string, playlistIds: string[]) => void;
  onOpened: (videoIds: string[]) => void;
}

export function LibraryView({ section, onPlay, onOpened }: LibraryViewProps) {
  const { videos } = useVideoLibrary();
  const sectionVideos = selectSectionVideos(videos, section);
  const sectionVideoIds = sectionVideos.map(video => video.id);

  const openFiles = async () => {
    const picked = await mudio.library.pickAndImportFiles();
    if (picked.length > 0) onOpened(picked.map(video => video.id));
  };

  const reportFailure = (action: string) => (error: unknown) =>
    log('error', 'Library', `${action} failed: ${describeError(error)}`);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={LIBRARY_SECTION_TITLE[section]}
        description={`${sectionVideos.length} 个视频`}
        actions={(
          <>
            <Button variant="outline" onClick={() => mudio.library.pickAndImportFolder().catch(reportFailure('Import folder'))}>
              <FolderPlus />
              导入文件夹
            </Button>
            <Button variant="primary" onClick={() => openFiles().catch(reportFailure('Open files'))}>
              <FilePlus2 />
              打开文件
            </Button>
          </>
        )}
      />
      <div className="flex-1 overflow-y-auto">
        {sectionVideos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Clapperboard className="size-10 text-muted-foreground" strokeWidth={1.25} />
            <p className="text-sm">{EMPTY_MESSAGE[section]}</p>
            {section === 'all' && <p className="text-xs text-muted-foreground">支持 {SUPPORTED_FORMAT_HINT}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-5 gap-y-6 p-6">
            {sectionVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={() => onPlay(video.id, sectionVideoIds)}
                onRemove={() => mudio.library.remove(video.id).catch(reportFailure('Remove video'))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
