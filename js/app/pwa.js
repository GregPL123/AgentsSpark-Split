/**
 * AgentSpark PWA Logic
 */
import { showNotif } from '../ui/notifications.js';

/**
 * Initialize PWA features: Service Worker, Offline Detection, and Install Prompt
 */
export function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            _showUpdateToast(reg);
                        }
                    });
                });
                window.addEventListener('focus', () => reg.update());
            })
            .catch(err => console.warn('[AgentSpark PWA] SW registration failed:', err));

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }

    // Offline/Online detection
    const offlineBar = document.getElementById('offline-bar');
    const updateOnlineStatus = () => {
        if (offlineBar) offlineBar.classList.toggle('visible', !navigator.onLine);
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Install prompt (A2HS) logic
    let deferredPrompt = null;
    const DISMISSED_KEY = 'agentspark-pwa-dismissed';

    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;

        // Check if dismissed in the last 7 days
        const dismissed = localStorage.getItem(DISMISSED_KEY);
        if (dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return;

        setTimeout(_showInstallBanner, 3000);
    });

    window.addEventListener('appinstalled', () => {
        _hideInstallBanner();
        showNotif('✓ AgentSpark installed!');
        deferredPrompt = null;
    });

    // Global helpers for inline buttons
    window._pwaInstall = async () => {
        if (!deferredPrompt) return;
        _hideInstallBanner();
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (outcome === 'dismissed') localStorage.setItem(DISMISSED_KEY, Date.now());
    };

    window._pwaDismiss = () => {
        _hideInstallBanner();
        localStorage.setItem(DISMISSED_KEY, Date.now());
    };
}

function _showInstallBanner() {
    if (document.getElementById('pwa-install-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
    <div class="pwa-install-icon">⚡</div>
    <div class="pwa-install-text">
      <div class="pwa-install-title">Install AgentSpark</div>
      <div class="pwa-install-sub">Add to home screen — works offline</div>
    </div>
    <div class="pwa-install-actions">
      <button class="pwa-install-btn" onclick="window._pwaInstall()">Install</button>
      <button class="pwa-dismiss-btn" onclick="window._pwaDismiss()">✕</button>
    </div>
  `;
    document.body.appendChild(banner);
}

function _hideInstallBanner() {
    const b = document.getElementById('pwa-install-banner');
    if (b) {
        b.style.opacity = '0';
        b.style.transform = 'translateY(20px)';
        setTimeout(() => b.remove(), 300);
    }
}

function _showUpdateToast(reg) {
    if (document.getElementById('pwa-update-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.className = 'pwa-update-toast pwa-bottom-sheet';
    toast.innerHTML = `
    <span>🔄 New version available</span>
    <button class="pwa-update-btn" onclick="window._pwaUpdate()">Update</button>
    <button class="pwa-dismiss-btn" onclick="this.parentElement.remove()">✕</button>
  `;

    window._pwaUpdate = () => {
        toast.remove();
        if (reg.waiting) reg.waiting.postMessage('skipWaiting');
    };

    document.body.appendChild(toast);
}
