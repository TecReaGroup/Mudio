import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-sc';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { PlayerApp } from './app/PlayerApp';
import { mudio } from './shared/api/mudio';
import { PLAYER_VIEW_HASH } from './shared/contract/mudio-contract';
import './styles.css';

// Lets CSS reserve space for the platform's native window controls.
document.documentElement.dataset.platform = mudio.platform;

const RootApp = window.location.hash === `#${PLAYER_VIEW_HASH}` ? PlayerApp : App;

createRoot(document.getElementById('root')!).render(<StrictMode><RootApp /></StrictMode>);
