import React from 'react';
import ReactDOM from 'react-dom/client';

// Self-hosted rather than a Google Fonts <link>: CI and the Docker build run
// without network access to fonts.googleapis.com, and this avoids a
// render-blocking third-party request. One variable file covers every weight.
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

// Imported as its own entry rather than via @import from index.css: CRA 5
// injects Tailwind itself and does not reliably run postcss-import, so an
// @import may not resolve before Tailwind processes the file.
import './styles/tokens.css';
import './index.css';

import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
