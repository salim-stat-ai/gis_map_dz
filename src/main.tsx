import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker only on HTTP/HTTPS origins (skip on standalone file:// portable mode)
if (typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // Ignore if building with standalone single-file portable config
    });
}

createRoot(document.getElementById('root')!).render(<App />);
