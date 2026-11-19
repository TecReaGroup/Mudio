import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import type { MudioApi } from '../../src/shared/contract/mudio-contract';
import { installFakeMudio } from './fake-mudio';

// Must exist before app modules load: they capture this object at import time. Tests fill it via installFakeMudio.
window.mudio = {} as MudioApi;
installFakeMudio();

// jsdom lacks the APIs below. Each stub does the minimum the components rely on, without real media or layout.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

Element.prototype.scrollIntoView = function scrollIntoView() {};

// jsdom's play() returns undefined and logs "not implemented"; callers chain .catch() on the promise.
Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: () => Promise.resolve() });
Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: () => undefined });
Object.defineProperty(HTMLMediaElement.prototype, 'load', { configurable: true, value: () => undefined });

if (!('ResizeObserver' in window)) {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
}

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup();
  installFakeMudio();
});
