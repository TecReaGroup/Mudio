import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { VideoLibrary } from '../../../electron/library/video-library';
import type { LibrarySnapshot, VideoEntry } from '../../../src/shared/contract/mudio-contract';
import { createTempDirectory, writeFakeVideo } from '../../support/temp-directory';

vi.mock('../../../electron/log/logger', () => import('../../support/silent-logger'));
// Placeholder files carry no real metadata; titles fall back to file names, as they do for untagged videos.
vi.mock('../../../electron/library/video-metadata', async () => {
  const { basename, extname } = await import('node:path');
  const fileNameTitle = (filePath: string) => basename(filePath, extname(filePath));
  return {
    fileNameTitle,
    readVideoMetadata: async (filePath: string) => ({ title: fileNameTitle(filePath), coverBytes: null, durationSec: null }),
  };
});

const CURRENT_DOCUMENT_VERSION = 3;

function titlesOf(videos: VideoEntry[]): string[] {
  return videos.map(video => video.title);
}

function playlistByTitle(snapshot: LibrarySnapshot, title: string) {
  return snapshot.playlists.find(playlist => playlist.title === title);
}

describe('VideoLibrary', () => {
  let directory: Awaited<ReturnType<typeof createTempDirectory>>;
  let dataDirectory: string;
  let videoRoot: string;
  let onChange: Mock<(snapshot: LibrarySnapshot) => void>;

  const openLibrary = () => VideoLibrary.open(dataDirectory, onChange);
  const videoPath = (...segments: string[]) => join(videoRoot, ...segments);

  beforeEach(async () => {
    directory = await createTempDirectory('video-library');
    dataDirectory = join(directory.path, 'data');
    videoRoot = join(directory.path, 'Videos');
    onChange = vi.fn();
  });

  afterEach(() => directory.remove());

  describe('import', () => {
    it('imports supported videos from a folder, skipping other files, hidden entries and folders past the depth limit', async () => {
      await writeFakeVideo(videoPath('a.mp4'));
      await writeFakeVideo(videoPath('upper.MOV'));
      await writeFakeVideo(videoPath('notes.txt'));
      await writeFakeVideo(videoPath('.hidden.mp4'));
      await writeFakeVideo(videoPath('.cache', 'cached.mp4'));
      await writeFakeVideo(videoPath('1', '2', '3', '4', '5', 'deep.mkv'));
      await writeFakeVideo(videoPath('1', '2', '3', '4', '5', '6', 'too-deep.mp4'));
      const library = await openLibrary();

      const imported = await library.importPaths([videoRoot]);

      expect(titlesOf(imported).sort()).toEqual(['a', 'deep', 'upper']);
      expect(titlesOf(library.snapshot().videos).sort()).toEqual(['a', 'deep', 'upper']);
    });

    it('is idempotent: importing the same file twice keeps one entry with the same id', async () => {
      const filePath = await writeFakeVideo(videoPath('a.mp4'));
      const library = await openLibrary();

      const [first] = await library.importPaths([filePath]);
      const [second] = await library.importPaths([filePath, videoRoot]);

      expect(second.id).toBe(first.id);
      expect(library.snapshot().videos).toHaveLength(1);
    });

    it.runIf(process.platform === 'win32')('treats paths differing only in case as the same file on Windows', async () => {
      const filePath = await writeFakeVideo(videoPath('Clip.mp4'));
      const library = await openLibrary();

      const [first] = await library.importPaths([filePath]);
      const [second] = await library.importPaths([filePath.toUpperCase()]);

      expect(second.id).toBe(first.id);
      expect(library.snapshot().videos).toHaveLength(1);
    });

    it('skips paths that do not exist without failing the rest', async () => {
      const filePath = await writeFakeVideo(videoPath('a.mp4'));
      const library = await openLibrary();

      const imported = await library.importPaths([videoPath('missing.mp4'), filePath]);

      expect(titlesOf(imported)).toEqual(['a']);
    });

    it('publishes every change to the windows', async () => {
      const filePath = await writeFakeVideo(videoPath('a.mp4'));
      const library = await openLibrary();

      await library.importPaths([filePath]);

      expect(onChange).toHaveBeenLastCalledWith(library.snapshot());
    });
  });

  describe('order', () => {
    it('arranges the library, ignoring unknown ids and appending the ones left out', async () => {
      const files = await Promise.all(['a', 'b', 'c'].map(name => writeFakeVideo(videoPath(`${name}.mp4`))));
      const library = await openLibrary();
      const [a, , c] = await library.importPaths(files);

      await library.arrange([c.id, 'ghost', a.id]);

      expect(titlesOf(library.snapshot().videos)).toEqual(['c', 'a', 'b']);
    });
  });

  describe('Recent', () => {
    it('appends a video on its first play only and saves its position', async () => {
      const files = await Promise.all(['a', 'b'].map(name => writeFakeVideo(videoPath(`${name}.mp4`))));
      const library = await openLibrary();
      const [a, b] = await library.importPaths(files);

      await library.recordPlayback(b.id, 10);
      await library.recordPlayback(a.id, 20);
      await library.recordPlayback(b.id, 30);

      const snapshot = library.snapshot();
      expect(snapshot.recentIds).toEqual([b.id, a.id]);
      expect(library.find(b.id)?.resumePositionSec).toBe(30);
      expect(library.find(b.id)?.lastPlayedAt).not.toBeNull();
    });

    it('forgets only the playback record when removed from Recent', async () => {
      const filePath = await writeFakeVideo(videoPath('a.mp4'));
      const library = await openLibrary();
      const [a] = await library.importPaths([filePath]);
      await library.recordPlayback(a.id, 10);

      await library.removeFromRecent(a.id);

      expect(library.snapshot().recentIds).toEqual([]);
      expect(library.find(a.id)).toBeDefined();
    });

    it('ignores playback records for unknown videos', async () => {
      const library = await openLibrary();
      await library.recordPlayback('ghost', 10);
      expect(library.snapshot().recentIds).toEqual([]);
    });
  });

  describe('playlists', () => {
    it('puts a video in exactly the named playlists, creating missing ones and dropping emptied ones', async () => {
      const files = await Promise.all(['a', 'b'].map(name => writeFakeVideo(videoPath(`${name}.mp4`))));
      const library = await openLibrary();
      const [a, b] = await library.importPaths(files);

      await library.editVideo(a.id, { title: 'Renamed A', playlistTitles: ['Trip', 'Favorites'] });
      await library.editVideo(b.id, { title: 'b', playlistTitles: ['Trip'] });
      expect(playlistByTitle(library.snapshot(), 'Trip')?.videoIds).toEqual([a.id, b.id]);
      expect(library.find(a.id)?.title).toBe('Renamed A');

      await library.editVideo(a.id, { title: 'Renamed A', playlistTitles: [] });
      const snapshot = library.snapshot();
      expect(playlistByTitle(snapshot, 'Trip')?.videoIds).toEqual([b.id]);
      expect(playlistByTitle(snapshot, 'Favorites')).toBeUndefined();
    });

    it('arranges a playlist without touching the others', async () => {
      const files = await Promise.all(['a', 'b'].map(name => writeFakeVideo(videoPath(`${name}.mp4`))));
      const library = await openLibrary();
      const [a, b] = await library.importPaths(files);
      await library.editVideo(a.id, { title: 'a', playlistTitles: ['Trip', 'Other'] });
      await library.editVideo(b.id, { title: 'b', playlistTitles: ['Trip', 'Other'] });
      const trip = playlistByTitle(library.snapshot(), 'Trip')!;

      await library.arrangePlaylist(trip.id, [b.id, a.id]);

      const snapshot = library.snapshot();
      expect(playlistByTitle(snapshot, 'Trip')?.videoIds).toEqual([b.id, a.id]);
      expect(playlistByTitle(snapshot, 'Other')?.videoIds).toEqual([a.id, b.id]);
    });
  });

  describe('library folders', () => {
    it('keeps every video under a folder in the folder playlists, including videos found later', async () => {
      await writeFakeVideo(videoPath('a.mp4'));
      await writeFakeVideo(videoPath('b.mp4'));
      const library = await openLibrary();
      await library.addFolder(videoRoot);
      await library.editFolderPlaylists(videoRoot, ['Holiday']);
      const [a] = library.snapshot().videos;

      // The edit asks to leave Holiday, but the folder holds the video there.
      await library.editVideo(a.id, { title: a.title, playlistTitles: [] });
      await writeFakeVideo(videoPath('c.mp4'));
      await library.rescanFolders();

      const snapshot = library.snapshot();
      expect(playlistByTitle(snapshot, 'Holiday')?.videoIds).toHaveLength(3);
      expect(snapshot.folders[0].videoIds).toHaveLength(3);
    });

    it('drops a folder playlist once the folder no longer names it', async () => {
      await writeFakeVideo(videoPath('a.mp4'));
      const library = await openLibrary();
      await library.addFolder(videoRoot);
      await library.editFolderPlaylists(videoRoot, ['Holiday']);

      await library.editFolderPlaylists(videoRoot, []);

      expect(library.snapshot().playlists).toEqual([]);
    });

    it('adding a known folder again only rescans it', async () => {
      await writeFakeVideo(videoPath('a.mp4'));
      const library = await openLibrary();
      await library.addFolder(videoRoot);

      await library.addFolder(videoRoot);

      expect(library.snapshot().folders).toHaveLength(1);
      expect(library.snapshot().videos).toHaveLength(1);
    });

    it('removing a folder keeps the videos another library folder still covers', async () => {
      await writeFakeVideo(videoPath('a.mp4'));
      await writeFakeVideo(videoPath('sub', 'b.mp4'));
      const library = await openLibrary();
      await library.addFolder(videoRoot);
      await library.addFolder(videoPath('sub'));

      await library.removeFolder(videoRoot);

      expect(titlesOf(library.snapshot().videos)).toEqual(['b']);
      expect(library.snapshot().folders.map(folder => folder.path)).toEqual([videoPath('sub')]);
    });

    it('rescanning drops videos whose files are gone from Recent and playlists as well', async () => {
      const goneFile = await writeFakeVideo(videoPath('gone.mp4'));
      await writeFakeVideo(videoPath('kept.mp4'));
      const library = await openLibrary();
      await library.addFolder(videoRoot);
      const gone = library.snapshot().videos.find(video => video.title === 'gone')!;
      await library.recordPlayback(gone.id, 10);
      await library.editVideo(gone.id, { title: 'gone', playlistTitles: ['Trip'] });

      await rm(goneFile);
      await library.rescanFolders();

      const snapshot = library.snapshot();
      expect(titlesOf(snapshot.videos)).toEqual(['kept']);
      expect(snapshot.recentIds).toEqual([]);
      expect(snapshot.playlists).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('reopens with exactly the state it saved', async () => {
      const files = await Promise.all(['a', 'b'].map(name => writeFakeVideo(videoPath(`${name}.mp4`))));
      const library = await openLibrary();
      await library.addFolder(videoRoot);
      const [a, b] = await library.importPaths(files);
      await library.recordPlayback(b.id, 42);
      await library.editVideo(a.id, { title: 'Renamed', playlistTitles: ['Trip'] });
      await library.arrange([b.id, a.id]);

      const reopened = await openLibrary();

      expect(reopened.snapshot()).toEqual(library.snapshot());
    });

    it('repairs a hand-edited document: duplicate and unknown ids, empty playlists, legacy folder paths', async () => {
      const filePath = await writeFakeVideo(videoPath('a.mp4'));
      const library = await openLibrary();
      const [a] = await library.importPaths([filePath]);
      await writeFile(join(dataDirectory, 'library.json'), JSON.stringify({
        version: CURRENT_DOCUMENT_VERSION,
        videos: [a],
        recentIds: [a.id, a.id, 'ghost'],
        playlists: [
          { id: 'p1', title: 'Trip', videoIds: [a.id, 'ghost', a.id] },
          { id: 'p2', title: 'Empty', videoIds: ['ghost'] },
        ],
        folders: [videoRoot],
      }), 'utf8');

      const snapshot = (await openLibrary()).snapshot();

      expect(snapshot.recentIds).toEqual([a.id]);
      expect(snapshot.playlists).toEqual([{ id: 'p1', title: 'Trip', videoIds: [a.id] }]);
      expect(snapshot.folders).toEqual([{ path: videoRoot, playlistTitles: [], videoIds: [a.id] }]);
    });

    // A hand-edited document is tolerated elsewhere (see above); valid JSON of the wrong shape should be too,
    // since a throw here aborts startup.
    it.each(['null', '{}', '[]'])('starts with an empty library when library.json holds %s', async content => {
      await mkdir(dataDirectory, { recursive: true });
      await writeFile(join(dataDirectory, 'library.json'), content, 'utf8');

      const library = await openLibrary();

      expect(library.snapshot().videos).toEqual([]);
    });
  });
});
