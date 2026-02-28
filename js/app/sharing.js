/**
 * AgentSpark Sharing Logic
 */
import { state } from '../core/state.js';
import { compress, decompress, compressBytes, decompressBytes } from '../core/compression.js';
import { aesGcmEncrypt, aesGcmDecrypt, xorObfuscate } from '../core/crypto.js';
import { uint8ToBase64url, base64urlToUint8, deepClone } from '../core/utils.js';
import { showNotif } from '../ui/notifications.js';
import { promptPassword, unlockShowError, closeModal, openModal } from '../ui/modals.js';

let _shareUrl = '';
let _shareMode = 'open';

/**
 * Generate a shareable URL containing the current project state
 */
export async function generateShareUrl() {
    const passwordEl = document.getElementById('share-password-input');
    const password = passwordEl?.value?.trim() || '';
    const usePassword = _shareMode === 'password' && password.length > 0;

    const payload = {
        v: 3,             // v3 = AES-GCM encrypted (v2 = legacy XOR)
        topic: state.currentTopic,
        level: state.currentLevel,
        lang: state.lang,
        agents: state.generatedAgents,
        files: state.generatedFiles,
        ts: Date.now(),
        pw: usePassword,
    };

    try {
        const jsonStr = JSON.stringify(payload);
        let encoded;

        if (usePassword) {
            // Encrypt with AES-256-GCM, then compress the packed binary
            const encrypted = await aesGcmEncrypt(jsonStr, password);
            const compressed = await compressBytes(encrypted);
            encoded = uint8ToBase64url(compressed);
        } else {
            const compressed = await compress(jsonStr);
            encoded = uint8ToBase64url(compressed);
        }

        const base = window.location.href.split('#')[0];
        _shareUrl = `${base}#share=${encoded}`;

        const displayEl = document.getElementById('share-url-display');
        if (displayEl) displayEl.value = _shareUrl;

        const kb = (_shareUrl.length / 1024).toFixed(1);
        const sizeEl = document.getElementById('share-size-label');
        if (sizeEl) {
            sizeEl.textContent = `${kb} KB`;
            sizeEl.className = parseFloat(kb) > 100 ? 'share-size-warn' : '';
        }
        const agentEl = document.getElementById('share-agent-count');
        if (agentEl) agentEl.textContent = `${state.generatedAgents.length} agents`;

        const verEl = document.getElementById('share-version-label');
        if (verEl) verEl.textContent = `v${state.versionHistory.length || 1} (latest)`;

    } catch (e) {
        const displayEl = document.getElementById('share-url-display');
        if (displayEl) displayEl.value = 'Error generating link: ' + e.message;
    }
}

/**
 * Handle share mode toggle (Open vs Password)
 */
export function onShareModeChange() {
    const checked = document.querySelector('input[name="share-mode"]:checked');
    const val = checked?.value || 'open';
    _shareMode = val;

    const openOpt = document.getElementById('share-opt-open');
    const pwOpt = document.getElementById('share-opt-password');
    if (openOpt) openOpt.classList.toggle('active', val === 'open');
    if (pwOpt) pwOpt.classList.toggle('active', val === 'password');

    const pwRow = document.getElementById('share-password-row');
    if (pwRow) pwRow.style.display = val === 'password' ? 'flex' : 'none';

    generateShareUrl();
}

/**
 * Open the share modal and initialize state
 */
export function openShareModal() {
    if (!state.generatedAgents.length) {
        showNotif(state.lang === 'en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
        return;
    }
    _shareMode = 'open';
    const openOpt = document.querySelector('input[name="share-mode"][value="open"]');
    if (openOpt) openOpt.checked = true;

    const openOptEl = document.getElementById('share-opt-open');
    const pwOptEl = document.getElementById('share-opt-password');
    if (openOptEl) openOptEl.classList.add('active');
    if (pwOptEl) pwOptEl.classList.remove('active');

    const pwRow = document.getElementById('share-password-row');
    if (pwRow) pwRow.style.display = 'none';

    const pwInput = document.getElementById('share-password-input');
    if (pwInput) pwInput.value = '';

    const copyBtn = document.getElementById('share-copy-btn');
    if (copyBtn) { copyBtn.textContent = '📋 Copy'; copyBtn.classList.remove('copied'); }

    openModal('share-modal');
    generateShareUrl();
}

/**
 * Close the share modal
 */
export function closeShareModal() {
    closeModal('share-modal');
}

/**
 * Copy the generated share URL to clipboard
 */
export async function copyShareUrl() {
    if (!_shareUrl) return;
    try {
        await navigator.clipboard.writeText(_shareUrl);
        const btn = document.getElementById('share-copy-btn');
        if (btn) {
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); }, 2500);
        }
        showNotif(state.lang === 'en' ? '✓ Share link copied!' : '✓ Link skopiowany!');
    } catch (e) {
        showNotif(state.lang === 'en' ? '⚠ Copy failed' : '⚠ Kopiowanie nieudane', true);
    }
}

/**
 * Load project state from the URL hash on startup
 */
export async function loadFromHash() {
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return false;

    const encoded = hash.slice('#share='.length);
    if (!encoded) return false;

    try {
        const bytes = base64urlToUint8(encoded);
        let payload = null;
        let jsonStr = null;

        // Try decompressing as plain Gzip first
        try {
            jsonStr = await decompress(bytes);
            payload = JSON.parse(jsonStr);
        } catch (e) { }

        // Legacy XOR (v2)
        if (payload && payload.pw) {
            let pw;
            try {
                pw = await promptPassword(
                    state.lang === 'en'
                        ? '🔒 This team is password protected. Enter the password to unlock it.'
                        : '🔒 Ten zespół jest chroniony hasłem. Podaj hasło, aby go odblokować.'
                );
            } catch (e) { return false; }

            while (true) {
                const decrypted = xorObfuscate(jsonStr, pw);
                try {
                    payload = JSON.parse(decrypted);
                    break;
                } catch (e2) {
                    unlockShowError();
                    try { pw = await promptPassword(); } catch (e3) { return false; }
                }
            }
        }

        // AES-GCM (v3)
        if (!payload) {
            let decompressedBytes;
            try {
                decompressedBytes = await decompressBytes(bytes);
            } catch (e) {
                decompressedBytes = bytes;
            }

            let pw;
            try {
                pw = await promptPassword(
                    state.lang === 'en'
                        ? '🔒 This team is password protected (AES-256-GCM). Enter the password to unlock it.'
                        : '🔒 Ten zespół jest zaszyfrowany (AES-256-GCM). Podaj hasło, aby go odblokować.'
                );
            } catch (e) { return false; }

            while (true) {
                try {
                    const decrypted = await aesGcmDecrypt(decompressedBytes, pw);
                    payload = JSON.parse(decrypted);
                    break;
                } catch (e) {
                    unlockShowError();
                    try { pw = await promptPassword(); } catch (e2) { return false; }
                }
            }
        }

        if (!payload?.agents?.length) return false;

        // Restore state
        state.currentTopic = payload.topic || 'Shared Team';
        state.currentLevel = payload.level || 'iskra';
        if (payload.lang) state.lang = payload.lang;
        state.generatedAgents = payload.agents;
        state.generatedFiles = payload.files || {};
        state.versionHistory = [{
            id: Date.now(),
            label: state.lang === 'en' ? `Shared: ${state.currentTopic}` : `Udostępniony: ${state.currentTopic}`,
            ts: new Date(payload.ts || Date.now()),
            agents: deepClone(state.generatedAgents),
            files: deepClone(state.generatedFiles),
            diff: { added: [], removed: [], changed: [] },
            removedNames: {},
            agentNames: Object.fromEntries(state.generatedAgents.map(a => [a.id, a.name])),
            vNum: 1,
            isOrigin: true,
        }];

        // Show results (using window property for now, will be updated in next steps)
        if (typeof window.showResults === 'function') {
            window.showResults();
        } else {
            // Fallback or early return logic if navigation.js not yet loaded
            state.conversationState = 'results';
        }

        // Show shared banner
        const banner = document.getElementById('shared-banner');
        const bannerTitle = document.getElementById('shared-banner-title');
        const bannerSub = document.getElementById('shared-banner-sub');
        if (banner) {
            if (bannerTitle) bannerTitle.textContent = state.lang === 'en'
                ? `🔗 Shared team: "${state.currentTopic}"`
                : `🔗 Udostępniony zespół: "${state.currentTopic}"`;
            if (bannerSub) bannerSub.textContent = state.lang === 'en'
                ? `${state.generatedAgents.length} agents · Read-only view · Start Over to create your own`
                : `${state.generatedAgents.length} agentów · Widok tylko do odczytu · Zacznij od nowa, by stworzyć własny`;
            banner.style.display = 'flex';
        }

        // Clean hash from URL
        history.replaceState(null, '', window.location.pathname + window.location.search);
        return true;
    } catch (e) {
        console.warn('[AgentSpark] Failed to load shared URL:', e);
        return false;
    }
}
