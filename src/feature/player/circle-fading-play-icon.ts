import { createLucideIcon } from 'lucide-react';

// TODO: Import CircleFadingPlay from lucide-react once it is upgraded past 0.511, which lacks the icon.
// Assembled from lucide's own circle-fading-plus ring and circle-play triangle so it matches the set.
export const CircleFadingPlay = createLucideIcon('circle-fading-play', [
  ['path', { d: 'M12 2a10 10 0 0 1 7.38 16.75', key: 'ring-main' }],
  ['path', { d: 'M2.5 8.875a10 10 0 0 0-.5 3', key: 'ring-left' }],
  ['path', { d: 'M2.83 16a10 10 0 0 0 2.43 3.4', key: 'ring-bottom-left' }],
  ['path', { d: 'M4.636 5.235a10 10 0 0 1 .891-.857', key: 'ring-top-left' }],
  ['path', { d: 'M8.644 21.42a10 10 0 0 0 7.631-.38', key: 'ring-bottom' }],
  ['polygon', { points: '10 8 16 12 10 16 10 8', key: 'play' }],
]);
