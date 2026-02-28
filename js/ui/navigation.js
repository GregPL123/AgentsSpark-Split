/**
 * AgentSpark Navigation UI
 */
import { state } from '../core/state.js';
import { openProjectsScreen, loadProject } from '../app/projects.js';
import { dbGetAll } from '../core/database.js';
import { esc, formatDate } from '../core/utils.js';

const _ctxBarConfigs = {
    topic: { btns: [{ label: 'Projects', cls: '', fn: "iosTabNav('projects')" }] },
    chat: { btns: [{ label: 'Undo Last', cls: '', fn: 'undoLast()' }, { label: 'Restart', cls: 'danger', fn: 'restart()' }] },
    results: { btns: [{ label: '↩ Start Over', cls: '', fn: 'restart()' }] },
    projects: { btns: [{ label: '+ New Project', cls: 'primary', fn: "showScreen('topic')" }] },
};

/**
 * Synchronize Floating Action Button visibility
 */
export function syncFab() {
    const fab = document.getElementById('results-fab');
    if (!fab) return;
    const screenResults = document.getElementById('screen-results');
    const resultsActive = screenResults?.classList.contains('active');
    const shouldShow = resultsActive && state.generatedAgents.length > 0;
    fab.classList.toggle('fab-visible', shouldShow);
}

/**
 * Switch between application screens
 */
export function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${name}`);
    if (target) target.classList.add('active');

    syncIosTabBar(name);
    syncFab();
    updateContextBar(name);

    if (name === 'topic') {
        // Reset home segmented nav if needed
        const hsegTopics = document.getElementById('hseg-topics');
        if (hsegTopics && hsegTopics.classList.contains('active')) {
            // already on topics
        }
    }
}

/**
 * Synchronize iOS-style tab bar state with current screen
 */
export function syncIosTabBar(screenName) {
    const tabMap = {
        'topic': 'home',
        'projects': 'projects',
        'chat': 'chat',
        'results': 'results',
    };
    const activeTab = tabMap[screenName] || 'home';

    const chatTab = document.getElementById('tab-chat');
    const resultsTab = document.getElementById('tab-results');
    if (chatTab) chatTab.style.display = (screenName === 'chat' || screenName === 'results') ? '' : 'none';
    if (resultsTab) resultsTab.style.display = (screenName === 'results') ? '' : 'none';

    document.querySelectorAll('.ios-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('tab-' + activeTab);
    if (activeBtn) activeBtn.classList.add('active');
}

/**
 * Switch screen via tab bar click
 */
export function iosTabNav(tab) {
    if (tab === 'home') showScreen('topic');
    else if (tab === 'projects') openProjectsScreen();
    else if (tab === 'chat') showScreen('chat');
    else if (tab === 'results') showScreen('results');
}

/**
 * Update the context bar content
 */
export function updateContextBar(screenName) {
    const bar = document.getElementById('sticky-context-bar');
    if (!bar) return;
    const cfg = _ctxBarConfigs[screenName];
    if (!cfg) { bar.classList.remove('visible'); return; }

    bar.innerHTML = cfg.btns.map(b =>
        `<button class="ctx-btn ${b.cls}" onclick="${b.fn}">${b.label}</button>`
    ).join('');

    // small delay so spring animation triggers after paint
    requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('visible')));
}

/**
 * Switch between home panels (Topics, Projects, Custom)
 */
export function switchHomePanel(panel) {
    ['topics', 'projects', 'custom'].forEach(p => {
        document.getElementById('hpanel-' + p)?.classList.toggle('active', p === panel);
        const btn = document.getElementById('hseg-' + p);
        if (btn) {
            btn.classList.toggle('active', p === panel);
            btn.setAttribute('aria-selected', p === panel ? 'true' : 'false');
        }
    });
    if (panel === 'projects') renderHomeProjectsList();
}

/**
 * Renders a simplified project list for the home screen
 */
export async function renderHomeProjectsList() {
    const list = document.getElementById('home-projects-list');
    const empty = document.getElementById('home-projects-empty');
    const searchInput = document.getElementById('home-projects-search');
    const search = (searchInput?.value || '').toLowerCase();
    if (!list) return;

    let projects = [];
    try { projects = await dbGetAll(); } catch (e) { }

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

    list.innerHTML = filtered.map(p => `
    <div class="project-card" tabindex="0" role="button" aria-label="${esc(p.name)}"
      onclick="loadProject('${p.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();loadProject('${p.id}')}">
      <div class="project-card-name">${esc(p.name)}</div>
      <div class="project-card-topic">📌 ${esc(p.topic || 'No topic')}</div>
      <div class="project-card-meta">
        ${(p.agents || []).length ? `<span class="project-card-tag">👥 ${(p.agents || []).length}</span>` : ''}
        ${p.level ? `<span class="project-card-tag">${p.level}</span>` : ''}
      </div>
      <div class="project-card-date">Updated ${formatDate(p.updatedAt)}</div>
    </div>
  `).join('');
}
