/**
 * AgentSpark Project Management
 */
import { state } from '../core/state.js';
import { dbGet, dbPut, dbDelete, dbGetAll } from '../core/database.js';
import { esc, formatDate, deepClone } from '../core/utils.js';
import { showNotif } from '../ui/notifications.js';

/**
 * Creates a snapshot of the current application state for saving
 */
export function _projectSnapshot() {
    return {
        topic: state.currentTopic,
        level: state.currentLevel,
        lang: state.lang,
        modelProvider: state.selectedModel.provider,
        modelId: state.selectedModel.model,
        agents: deepClone(state.generatedAgents),
        files: deepClone(state.generatedFiles),
        versionHistory: deepClone(state.versionHistory),
        chatHistory: deepClone(state.chatHistory),
    };
}

/**
 * Returns a default project name if none is provided
 */
export function _projectName(topic) {
    return topic || 'Untitled Project';
}

/**
 * Schedules an automatic save after a delay
 */
export function scheduleAutoSave() {
    if (!state.generatedAgents.length) return;
    clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = setTimeout(() => saveCurrentProject(true), 2000);
}

/**
 * Saves the current project to the database
 */
export async function saveCurrentProject(silent = false) {
    if (!state.generatedAgents.length) {
        if (!silent) showNotif(state.lang === 'en' ? '⚠ Generate a team first before saving' : '⚠ Najpierw wygeneruj zespół', true);
        return;
    }
    try {
        const now = Date.now();
        const snap = _projectSnapshot();
        if (state.currentProjectId) {
            const existing = await dbGet(state.currentProjectId);
            if (existing) {
                await dbPut({ ...existing, ...snap, updatedAt: now });
            } else {
                state.currentProjectId = null; // was deleted externally — create new
            }
        }
        if (!state.currentProjectId) {
            state.currentProjectId = 'proj_' + now + '_' + Math.random().toString(36).slice(2, 7);
            await dbPut({
                id: state.currentProjectId,
                name: _projectName(state.currentTopic),
                createdAt: now,
                updatedAt: now,
                ...snap
            });
        } else {
            // Just update name in case topic changed
            const existing = await dbGet(state.currentProjectId);
            if (existing) await dbPut({ ...existing, name: _projectName(state.currentTopic), updatedAt: now, ...snap });
        }
        _showSaveIndicator();
        await _updateProjectsBadge();
        if (!silent) showNotif(state.lang === 'en' ? '✓ Project saved!' : '✓ Projekt zapisany!');
    } catch (e) {
        console.error('[AgentSpark] Save failed:', e);
        if (!silent) showNotif(state.lang === 'en' ? '⚠ Save failed: ' + e.message : '⚠ Błąd zapisu: ' + e.message, true);
    }
}

/**
 * Shows a brief "saved" indicator in the UI
 */
export function _showSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.textContent = '✓ saved';
    el.classList.add('visible');
    clearTimeout(_showSaveIndicator._t);
    _showSaveIndicator._t = setTimeout(() => el.classList.remove('visible'), 2500);
}

/**
 * Loads a project by its id and restores application state
 */
export async function loadProject(id) {
    try {
        const proj = await dbGet(id);
        if (!proj) { showNotif('⚠ Project not found', true); return; }

        // Restore all state
        state.currentTopic = proj.topic || '';
        state.currentLevel = proj.level || 'iskra';
        state.lang = proj.lang || 'en';
        state.generatedAgents = proj.agents || [];
        state.generatedFiles = proj.files || {};
        state.versionHistory = proj.versionHistory || [];
        state.chatHistory = proj.chatHistory || [];
        state.currentProjectId = proj.id;

        // Restore model if stored
        if (proj.modelId) {
            const opt = document.querySelector(`#modelSelect option[value*="${proj.modelId}"]`);
            if (opt) {
                opt.selected = true;
                // Note: global onModelChange will be called after full refactor
                if (typeof window.onModelChange === 'function') window.onModelChange();
            }
        }

        // Restore lang
        if (typeof window.setLang === 'function') window.setLang(state.lang);

        // Show results screen
        if (typeof window.showScreen === 'function') window.showScreen('results');

        const apiKeyHeader = document.getElementById('apiKeyHeader');
        if (apiKeyHeader) apiKeyHeader.style.display = 'flex';

        if (typeof window.renderResults === 'function') window.renderResults();

        _showSaveIndicator();
        showNotif(state.lang === 'en' ? `📂 "${proj.name}" loaded` : `📂 Załadowano "${proj.name}"`);
    } catch (e) {
        console.error('[AgentSpark] Load failed:', e);
        showNotif('⚠ Failed to load project: ' + e.message, true);
    }
}

/**
 * Deletes a project after user confirmation
 */
export async function deleteProject(id, name) {
    const confirmed = window.confirm(
        state.lang === 'en'
            ? `Delete project "${name}"? This cannot be undone.`
            : `Usunąć projekt "${name}"? Tej operacji nie można cofnąć.`
    );
    if (!confirmed) return;
    try {
        await dbDelete(id);
        if (state.currentProjectId === id) state.currentProjectId = null;
        await renderProjectsList();
        await _updateProjectsBadge();
        showNotif(state.lang === 'en' ? '🗑 Project deleted' : '🗑 Projekt usunięty');
    } catch (e) {
        showNotif('⚠ Delete failed: ' + e.message, true);
    }
}

/**
 * Duplicates an existing project
 */
export async function forkProject(id) {
    try {
        const proj = await dbGet(id);
        if (!proj) return;
        const now = Date.now();
        const newId = 'proj_' + now + '_' + Math.random().toString(36).slice(2, 7);
        await dbPut({
            ...proj,
            id: newId,
            name: proj.name + ' (copy)',
            createdAt: now,
            updatedAt: now,
        });
        await renderProjectsList();
        await _updateProjectsBadge();
        showNotif(state.lang === 'en' ? '✓ Project duplicated' : '✓ Projekt zduplikowany');
    } catch (e) {
        showNotif('⚠ Fork failed: ' + e.message, true);
    }
}

/**
 * Displays the projects screen and renders the list
 */
export async function openProjectsScreen() {
    if (typeof window._updateContextBar === 'function') window._updateContextBar('projects');
    if (typeof window.showScreen === 'function') window.showScreen('projects');
    await renderProjectsList();
}

/**
 * Renders the list of projects in the UI
 */
export async function renderProjectsList() {
    const list = document.getElementById('projects-list');
    const empty = document.getElementById('projects-empty');
    const searchEl = document.getElementById('projects-search');
    const search = (searchEl?.value || '').toLowerCase();
    if (!list) return;

    let projects = [];
    try { projects = await dbGetAll(); } catch (e) { console.error(e); }

    const filtered = search
        ? projects.filter(p => p.name.toLowerCase().includes(search) || (p.topic || '').toLowerCase().includes(search))
        : projects;

    if (!filtered.length) {
        list.innerHTML = '';
        list.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }
    list.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    list.innerHTML = filtered.map(p => {
        const updated = formatDate(p.updatedAt);
        const agentCount = (p.agents || []).length;
        const isCurrent = p.id === state.currentProjectId;
        const escName = esc(p.name).replace(/'/g, "\\'");

        return `
    <div class="project-card-wrap" id="wrap-${p.id}">
    <div class="project-swipe-actions" aria-hidden="true">
      <button class="swipe-action-btn open-btn" onclick="loadProject('${p.id}')"><span class="sa-icon">▶</span>Open</button>
      <button class="swipe-action-btn fork-btn" onclick="forkProject('${p.id}')"><span class="sa-icon">⎘</span>Fork</button>
      <button class="swipe-action-btn del-btn" onclick="deleteProject('${p.id}', '${escName}')"><span class="sa-icon">🗑</span>Del</button>
    </div>
    <div class="project-card" tabindex="0" role="button" aria-label="${esc(p.name)}" onclick="loadProject('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();loadProject('${p.id}')}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
        <div class="project-card-name">${esc(p.name)}${isCurrent ? '<span class="project-unsaved-dot" title="Current project"></span>' : ''}</div>
      </div>
      <div class="project-card-topic">📌 ${esc(p.topic || 'No topic')}</div>
      <div class="project-card-meta">
        ${agentCount ? `<span class="project-card-tag">👥 ${agentCount} agents</span>` : ''}
        ${p.level ? `<span class="project-card-tag">${p.level}</span>` : ''}
        ${p.lang ? `<span class="project-card-tag">${p.lang.toUpperCase()}</span>` : ''}
      </div>
      <div class="project-card-date">Updated ${updated}</div>
      <div class="project-card-actions" onclick="event.stopPropagation()">
        <button class="project-card-btn" onclick="loadProject('${p.id}')">▶ Open</button>
        <button class="project-card-btn" onclick="forkProject('${p.id}')">⎘ Fork</button>
        <button class="project-card-btn danger" onclick="deleteProject('${p.id}', '${escName}')">🗑</button>
      </div>
    </div>
    </div>`;
    }).join('');
}

/**
 * Updates the projects badge count in the sidebar and tab bar
 */
export async function _updateProjectsBadge() {
    try {
        const all = await dbGetAll();
        const badge = document.getElementById('projects-count-badge');
        const tabBadge = document.getElementById('tab-badge');
        if (!badge) return;
        if (all.length > 0) {
            badge.textContent = all.length + ' ';
            badge.style.display = 'inline';
            if (tabBadge) { tabBadge.textContent = all.length; tabBadge.style.display = ''; }
        } else {
            badge.style.display = 'none';
            if (tabBadge) tabBadge.style.display = 'none';
        }
    } catch (e) { }
}

/**
 * Hook for agent generation completion
 */
export function _onAgentsReady() {
    scheduleAutoSave();
    _updateProjectsBadge();
}
