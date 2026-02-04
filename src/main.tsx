import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StartupManager } from './utils/startup';

// Initialize startup manager to handle storage cleanup
StartupManager.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
// Trigger redeploy 20260204065444
