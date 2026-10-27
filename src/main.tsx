import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RepoProvider } from './data/RepoContext.tsx'
import { ToastProvider } from './ui/Toast.tsx'

// Ask the browser not to evict our data when storage is tight (best effort; installed PWAs are safest).
void navigator.storage?.persist?.()

// In the installed home-screen app, lock zoom so it feels native. The browser tab keeps pinch-zoom for accessibility.
const standalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
if (standalone) {
  document.documentElement.classList.add('standalone')
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
  // iOS ignores user-scalable=no, so also cancel Safari's pinch gestures.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepoProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </RepoProvider>
  </StrictMode>,
)
