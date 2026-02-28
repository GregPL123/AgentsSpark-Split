/**
 * AgentSpark Theme Management (Dark/Light/OS)
 */
import { showNotif } from './notifications.js';
import { state } from '../core/state.js';

/**
 * Core theme toggle logic
 */
export function _toggleThemeCore() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') !== 'light';
    const next = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('agentspark-theme', next);

    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';

    // Sync PWA theme-color meta
    const metaTC = document.getElementById('meta-theme-color');
    if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
}

let _themeHoldTimer = null;

/**
 * Toggle theme or reset to OS preference on long press
 */
export function toggleTheme() {
    if (_themeHoldTimer === null) return; // longpress already fired
    clearTimeout(_themeHoldTimer);
    _themeHoldTimer = null;
    _toggleThemeCore();
}

/**
 * Handle start of theme button press (for long press detection)
 */
export function themeHoldStart() {
    _themeHoldTimer = setTimeout(() => {
        _themeHoldTimer = null;
        localStorage.removeItem('agentspark-theme');
        const next = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);

        const btn = document.getElementById('theme-toggle-btn');
        if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';

        const metaTC = document.getElementById('meta-theme-color');
        if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';

        showNotif(state.lang === 'en' ? '🎨 Theme: following OS preference' : '🎨 Motyw: podąża za ustawieniami systemu');
    }, 600);
}

/**
 * Initialize theme based on saved preference or OS
 */
export function initTheme() {
    const saved = localStorage.getItem('agentspark-theme');
    const osDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (osDark ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', initial);

    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = initial === 'light' ? '☀️' : '🌙';

    const metaTC = document.getElementById('meta-theme-color');
    if (metaTC) metaTC.content = initial === 'light' ? '#faf7ee' : '#1a170d';
}
