import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { PlayerApp } from '../../src/app/PlayerApp';

/** Mounts the library window and waits until settings and the library have loaded. */
export async function renderLibraryWindow() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('searchbox');
  return user;
}

/** Mounts the player window; it renders once the pending playback request arrives. */
export async function renderPlayerWindow() {
  const user = userEvent.setup();
  render(<PlayerApp />);
  const playlistPanel = await screen.findByRole('complementary', { name: 'Playlist' });
  return { user, playlistPanel };
}
