/**
 * AgentSpark Modal Management
 */
import { state } from '../core/state.js';

let _unlockResolve = null;
let _unlockRejectCb = null;

/**
 * Open a generic modal by ID
 */
export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('open');
        const input = modal.querySelector('input, textarea');
        if (input) setTimeout(() => input.focus(), 80);
    }
}

/**
 * Close a generic modal by ID
 */
export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

/**
 * Prompt for a password (used for encrypted sharing)
 */
export function promptPassword(descText) {
    return new Promise((resolve, reject) => {
        _unlockResolve = resolve;
        _unlockRejectCb = reject;
        const descEl = document.getElementById('unlock-modal-desc');
        if (descEl && descText) descEl.textContent = descText;
        const input = document.getElementById('unlock-password-input');
        if (input) input.value = '';
        const errEl = document.getElementById('unlock-error');
        if (errEl) errEl.style.display = 'none';
        const modal = document.getElementById('unlock-modal');
        if (modal) {
            modal.classList.add('open');
            setTimeout(() => input?.focus(), 80);
        }
    });
}

/**
 * Confirm the password prompt
 */
export function unlockConfirm() {
    const pw = document.getElementById('unlock-password-input')?.value || '';
    if (!pw) return;
    const modal = document.getElementById('unlock-modal');
    if (modal) modal.classList.remove('open');
    if (_unlockResolve) { _unlockResolve(pw); _unlockResolve = null; }
}

/**
 * Reject the password prompt (cancel)
 */
export function unlockReject() {
    const modal = document.getElementById('unlock-modal');
    if (modal) modal.classList.remove('open');
    if (_unlockRejectCb) { _unlockRejectCb(new Error('cancelled')); _unlockRejectCb = null; }
}

/**
 * Show error in the password prompt
 */
export function unlockShowError() {
    const errEl = document.getElementById('unlock-error');
    if (errEl) errEl.style.display = 'block';
    const input = document.getElementById('unlock-password-input');
    if (input) { input.value = ''; input.focus(); }
    const modal = document.getElementById('unlock-modal');
    if (modal) modal.classList.add('open');
}

/**
 * Setup backdrop click listeners for all modals
 */
export function initModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (overlay.id === 'unlock-modal') unlockReject();
                else overlay.classList.remove('open');
            }
        });
    });
}
