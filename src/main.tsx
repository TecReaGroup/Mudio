import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { mudio } from './shared/api/mudio';
import './styles.css';

// Lets CSS reserve space for the platform's native window controls.
document.documentElement.dataset.platform = mudio.platform;

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
