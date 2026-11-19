import { expect } from 'vitest';

// Tailwind utilities that keep a long run of text inside its box, by clipping it or allowing breaks mid-word.
const TEXT_CONTAINMENT_CLASS = /(^|\s)(truncate|line-clamp-\d+|wrap-anywhere|wrap-break-word|break-words|break-all)(\s|$)/;

/**
 * jsdom has no layout engine, so overflow cannot be measured. This checks the contract instead:
 * the element holding user-controlled text, or its direct parent, clips or wraps it.
 */
export function expectTextContained(element: HTMLElement): void {
  const guarded = [element, element.parentElement].some(
    candidate => candidate !== null && TEXT_CONTAINMENT_CLASS.test(candidate.className),
  );
  expect(guarded, `"${element.textContent?.slice(0, 40)}…" can overflow its container: <${element.tagName.toLowerCase()} class="${element.className}">`).toBe(true);
}
