import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || 'YOUR_FRONTEND_DSN_HERE',
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracePropagationTargets: ['localhost:3001'],
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
