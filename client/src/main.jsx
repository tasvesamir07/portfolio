import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@fontsource-variable/inter/index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import { SiteAlertProvider } from './components/SiteAlertProvider.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import interWoff2 from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'

if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.href = interWoff2;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 2, // Try up to 3 times for resilience on cold starts
    },
  },
})

if (typeof window !== 'undefined') {
  window.addEventListener('portfolio:mutation', () => {
    queryClient.invalidateQueries();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteAlertProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <App />
        </I18nProvider>
      </QueryClientProvider>
    </SiteAlertProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        if (import.meta.env.DEV) {
          console.log('Service Worker registered successfully:', reg.scope);
        }

        const dispatchUpdate = () => {
          const event = new CustomEvent('sw:update-available', { detail: reg });
          window.dispatchEvent(event);
        };

        if (reg.waiting) {
          dispatchUpdate();
        }

        // Check if there is an update waiting or installing
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                dispatchUpdate();
              }
            });
          }
        });
      })
      .catch((err) => console.error('Service Worker registration failed:', err));
  });

  // Reload page when new service worker takes over (with a 500ms settle delay)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  });
}
