import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-sc';
import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { PlayerApp } from './app/PlayerApp';
import { TrayMenuApp } from './app/TrayMenuApp';
import { mudio } from './shared/api/mudio';
import { PLAYER_VIEW_HASH, TRAY_MENU_VIEW_HASH } from './shared/contract/mudio-contract';
import './styles.css';

const VIEW_ROOTS: Record<string, ComponentType> = {
  [PLAYER_VIEW_HASH]: PlayerApp,
  [TRAY_MENU_VIEW_HASH]: TrayMenuApp,
};

const viewHash = window.location.hash.slice(1);
// Lets CSS reserve space for the platform's native window controls.
document.documentElement.dataset.platform = mudio.platform;
document.documentElement.dataset.view = viewHash;

const RootApp = VIEW_ROOTS[viewHash] ?? App;

createRoot(document.getElementById('root')!).render(<StrictMode><RootApp /></StrictMode>);
