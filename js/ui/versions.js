/**
 * AgentSpark Version History UI
 */
import { state } from '../core/state.js';
import { esc, deepClone } from '../core/utils.js';
import { showResults } from './results.js';

/**
 * Renders the version history panel and timeline
 */
export function renderVersionPanel() {
    const panel = document.getElementById('version-panel');
    const timeline = document.getElementById('version-timeline');
    const badge = document.getElementById('version-count-badge');
    const icon = document.getElementById('version-toggle-icon');

    const total = state.versionHistory.length;
    if (total === 0) {
        if (panel) panel.style.display = 'none';
        return;
    }

    if (panel) panel.style.display = 'block';
    if (badge) badge.textContent = total;
    if (icon) icon.className = 'version-toggle-icon' + (state.versionPanelOpen ? ' open' : '');

    if (timeline) {
        timeline.className = 'version-timeline' + (state.versionPanelOpen ? ' open' : '');
        timeline.innerHTML = '';

        // Show newest first
        const reversed = [...state.versionHistory].reverse();

        reversed.forEach((v, ri) => {
            const isCurrentIdx = ri === 0;
            const origIdx = state.versionHistory.indexOf(v);

            const entry = document.createElement('div');
            entry.className = 'version-entry' + (isCurrentIdx ? ' current' : '') + (v.isOrigin ? ' origin' : '');

            const diffHtml = [
                ...v.diff.added.map(id => `<span class="diff-tag diff-added">+${v.agentNames?.[id] || id}</span>`),
                ...v.diff.removed.map(id => `<span class="diff-tag diff-removed">−${v.removedNames?.[id] || id}</span>`),
                ...v.diff.changed.map(id => `<span class="diff-tag diff-changed">~${v.agentNames?.[id] || id}</span>`),
            ].join('');

            const agentPreview = v.agents.map(a => a.name).join(', ');
            const timeLabel = _formatVersionTime(v.ts);

            const restoreBtn = !isCurrentIdx
                ? `<button class="version-btn restore-btn" onclick="restoreVersion(${origIdx})">↩ ${state.lang === 'en' ? 'Restore' : 'Przywróć'}</button>`
                : `<span class="version-current-tag">CURRENT</span>`;

            const diffBtn = origIdx > 0
                ? `<button class="version-btn diff-btn" onclick="showDiffModal(${origIdx})">🔍 ${state.lang === 'en' ? 'Diff' : 'Porównaj'}</button>`
                : '';

            const downloadBtn = `<button class="version-btn" onclick="downloadVersionZip(${origIdx})">⬇ ZIP</button>`;

            entry.innerHTML = `
        <div class="version-dot-col">
          <div class="version-dot">${v.isOrigin ? '●' : 'v' + v.vNum}</div>
        </div>
        <div class="version-card">
          <div class="version-card-top">
            <div class="version-label">${esc(v.label)}</div>
            <div class="version-time">${timeLabel}</div>
          </div>
          ${diffHtml ? `<div class="version-diff">${diffHtml}</div>` : ''}
          <div class="version-agents">⚡ ${agentPreview}</div>
          <div class="version-actions">${restoreBtn}${diffBtn}${downloadBtn}</div>
        </div>
      `;
            timeline.appendChild(entry);
        });
    }
}

/**
 * Toggle the version history panel open/closed
 */
export function toggleVersionPanel() {
    state.versionPanelOpen = !state.versionPanelOpen;
    renderVersionPanel();
}

/**
 * Formats version timestamp for display
 */
function _formatVersionTime(ts) {
    if (!ts) return '';
    const d = ts instanceof Date ? ts : new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return state.lang === 'en' ? 'just now' : 'przed chwilą';
    if (diffM < 60) return `${diffM}m ${state.lang === 'en' ? 'ago' : 'temu'}`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `${diffH}h ${state.lang === 'en' ? 'ago' : 'temu'}`;
    return d.toLocaleDateString();
}

/**
 * Restores a specific version as the current state
 */
export function restoreVersion(idx) {
    if (idx < 0 || idx >= state.versionHistory.length) return;
    const v = state.versionHistory[idx];

    // Save current state as new version before restoring (if not already latest)
    if (idx !== state.versionHistory.length - 1) {
        state.versionHistory.push({
            id: Date.now(),
            label: state.lang === 'en' ? `Restored v${v.vNum}` : `Przywrócono v${v.vNum}`,
            ts: new Date(),
            agents: deepClone(v.agents),
            files: deepClone(v.files),
            diff: { added: [], removed: [], changed: [] },
            removedNames: {},
            agentNames: Object.fromEntries(v.agents.map(a => [a.id, a.name])),
            vNum: state.versionHistory.length + 1,
        });
    }

    state.generatedAgents = deepClone(v.agents);
    state.generatedFiles = deepClone(v.files);

    showResults(true);
    if (typeof window.buildGraphFromAgents === 'function') window.buildGraphFromAgents();
    renderVersionPanel();

    if (typeof window.showNotif === 'function') {
        window.showNotif(state.lang === 'en' ? '↩ Reverted' : '↩ Przywrócono');
    }
}
