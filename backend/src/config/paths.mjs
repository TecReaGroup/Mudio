import { fileURLToPath } from 'node:url';

export const paths = {
  distRoot: fileURLToPath(new URL('../../../dist/renderer/', import.meta.url)),
  logRoot: fileURLToPath(new URL('../../data/log/', import.meta.url)),
};
