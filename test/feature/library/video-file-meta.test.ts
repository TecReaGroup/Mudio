import { describe, expect, it } from 'vitest';
import { describeVideoFile } from '../../../src/feature/library/video-file-meta';
import { buildVideo } from '../../support/fixture';

describe('describeVideoFile', () => {
  it('shows the upper-cased extension and the size', () => {
    expect(describeVideoFile(buildVideo(1, { filePath: 'D:\\Videos\\trip.mkv', sizeBytes: 1536 }))).toBe('MKV · 1.5 KB');
  });

  it('shows only the size when the file has no extension', () => {
    expect(describeVideoFile(buildVideo(1, { filePath: '/videos/trip', sizeBytes: 0 }))).toBe('0 B');
  });
});
