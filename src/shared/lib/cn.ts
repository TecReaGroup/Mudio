import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// NOTE: Must mirror the custom scales in styles.css @theme. Unregistered, `text-meta` would be read as a
// text color and silently evict `text-secondary` (and vice versa) when classes are merged.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['caption', 'meta', 'control', 'body', 'title-sm', 'title', 'title-lg'],
      radius: ['control-sm', 'control', 'card', 'dialog'],
      shadow: ['rest', 'raised', 'overlay'],
    },
  },
});

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
