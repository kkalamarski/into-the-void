import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/screens.css';
import { register } from './serviceWorkerRegistration';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for game asset caching
register();
