import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted, matching the pattern the real app uses — no live Google Fonts request (the mockup's own
// preview shell used a CDN <link>, but that's specific to the design-canvas tool, not something to
// replicate here; see design-reference/design-brief.md).
import '@fontsource-variable/space-grotesk';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';

import './styles/tokens.css';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
