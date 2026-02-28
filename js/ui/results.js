/**
 * AgentSpark Results Screen UI
 */
import { state, t } from '../core/state.js';
import { showScreen, updateContextBar } from './navigation.js';
import { renderMarkdown } from '../frameworks/markdown.js';
import { renderTraceLive } from './trace.js';
import { _onAgentsReady } from '../app/projects.js';

let currentModalFile = '';
let currentModalTab = 'preview';

/**
 * Renders the results screen with agents and team configuration
 */
export function showResults(skipReset = false) {
    showScreen('results');
    updateContextBar('results');

    if (!skipReset) renderSkeletonCards(4);

    const lvl = t().levels.find(l => l.id === state.currentLevel);
    const badge = document.getElementById('result-badge');
    if (badge) {
        badge.textContent = (lvl ? `${lvl.emoji} ${lvl.name.toUpperCase()} — ` : '') + t().resultBadge;
        if (lvl) {
            badge.style.borderColor = lvl.color + '66';
            badge.style.color = lvl.color;
        }
    }

    // Update static text
    const textMapping = {
        'result-title': 'resultTitle',
        'result-sub': 'resultSub',
        'download-btn': 'downloadBtn',
        'instr-btn': 'instrBtn',
        'refine-btn': 'refineBtn'
    };

    for (const [id, key] of Object.entries(textMapping)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t()[key];
    }

    const mdPreviewBtn = document.getElementById('md-preview-btn');
    if (mdPreviewBtn) mdPreviewBtn.textContent = state.lang === 'en' ? '📄 Preview Docs' : '📄 Podgląd Docs';

    const fwExportBtn = document.getElementById('fw-export-btn');
    if (fwExportBtn) fwExportBtn.textContent = state.lang === 'en' ? '🚀 Export Framework' : '🚀 Eksport Framework';

    // renderVersionPanel() will be implemented in versions.js
    if (typeof window.renderVersionPanel === 'function') window.renderVersionPanel();
    renderTraceLive();

    if (!skipReset) {
        state.refineHistory = [];
        state.isRefining = false;
        state.refineSnapshots = [];
        state.selectedRefineAction = null;
        const rp = document.getElementById('refine-panel');
        if (rp) rp.style.display = 'none';
        const rh = document.getElementById('refine-history');
        if (rh) rh.innerHTML = '';
    }

    // Auto-save hook
    _onAgentsReady();

    const grid = document.getElementById('agents-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const technical = state.generatedAgents.filter(a => a.type === 'technical');
    const business = state.generatedAgents.filter(a => a.type !== 'technical');

    _makeSection(grid, state.lang === 'en' ? 'Technical Agents — Build your app' : 'Agenci Techniczni — Budują aplikację', '⚙️', technical, 'section-tech');
    _makeSection(grid, state.lang === 'en' ? 'Business Agents — Shape your vision' : 'Agenci Biznesowi — Nadają kontekst', '💼', business, 'section-biz');

    // Team Config Section
    const configWrap = document.createElement('div');
    configWrap.className = 'agent-section';
    configWrap.innerHTML = `<div class="agent-section-header section-config"><span>🔗</span><span>${state.lang === 'en' ? 'Team Configuration' : 'Konfiguracja Zespołu'}</span></div>`;
    const configGrid = document.createElement('div');
    configGrid.className = 'agents-grid';
    configGrid.appendChild(_makeConfigCard());
    configWrap.appendChild(configGrid);
    grid.appendChild(configWrap);

    // Ensure graph and scored data sections are handled
    document.getElementById('graph-title').textContent = state.lang === 'en' ? 'Agent Dependency Graph' : 'Graf Zależności Agentów';
    document.getElementById('graph-section').style.display = 'block';
}

function _makeSection(parent, title, icon, agents, colorClass) {
    if (agents.length === 0) return;
    const section = document.createElement('div');
    section.className = 'agent-section';
    section.innerHTML = `<div class="agent-section-header ${colorClass}"><span>${icon}</span><span>${title}</span><span class="section-count">${agents.length}</span></div>`;
    const sg = document.createElement('div');
    sg.className = 'agents-grid';
    agents.forEach(a => sg.appendChild(_makeAgentCard(a)));
    section.appendChild(sg);
    parent.appendChild(section);
}

function _makeAgentCard(agent) {
    const isTech = agent.type === 'technical';
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.dataset.type = agent.type || 'technical';
    card.dataset.agentId = agent.id;
    card.innerHTML = `
    <div class="agent-card-header">
      <div class="agent-avatar" style="background:${isTech ? 'linear-gradient(145deg,#c49a0a,#f2b90d)' : 'linear-gradient(145deg,#c44010,#e05a1a)'}">${agent.emoji || '🤖'}</div>
      <div class="agent-card-meta">
        <div class="agent-name">${agent.name}</div>
        <div class="agent-role">${agent.role}</div>
        <div class="agent-type-badge ${isTech ? 'badge-tech' : 'badge-biz'}" style="display:inline-block;margin-top:0.4rem;">${isTech ? (state.lang === 'en' ? 'Technical' : 'Techniczny') : (state.lang === 'en' ? 'Business' : 'Biznesowy')}</div>
      </div>
    </div>
    <div class="agent-card-divider"></div>
    <div class="agent-card-body">
      <div class="agent-desc">${agent.description}</div>
      <div class="file-chips-group">
        <span class="file-chips-label">Files</span>
        <div class="file-chips">
          <div class="file-chip" tabindex="0" role="button" onclick="previewFile('agent-${agent.id}.md')">agent-${agent.id}.md</div>
          <div class="file-chip" tabindex="0" role="button" onclick="previewFile('skill-${agent.id}.md')">skill-${agent.id}.md</div>
        </div>
      </div>
    </div>
  `;
    card.tabIndex = 0;
    return card;
}

function _makeConfigCard() {
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.innerHTML = `
    <div class="agent-card-header">
      <div class="agent-avatar" style="background:linear-gradient(145deg,#2a2510,#3a3218)">🔗</div>
      <div class="agent-card-meta">
        <div class="agent-name">team-config.md</div>
        <div class="agent-role">${state.lang === 'en' ? 'Wiring & Protocols' : 'Połączenia i Protokoły'}</div>
      </div>
    </div>
    <div class="agent-card-divider"></div>
    <div class="agent-card-body">
      <div class="agent-desc">${state.lang === 'en' ? 'Defines how agents communicate, hand off tasks, and share context.' : 'Definiuje jak agenci komunikują się, przekazują zadania i współdzielą kontekst.'}</div>
      <div class="file-chips">
        <div class="file-chip" onclick="previewFile('team-config.md')">team-config.md</div>
        <div class="file-chip" onclick="previewFile('README.md')">README.md</div>
      </div>
    </div>
  `;
    return card;
}

export function previewFile(filename) {
    const content = state.generatedFiles[filename];
    if (!content) return;

    currentModalFile = filename;
    currentModalTab = 'preview';

    document.getElementById('modal-title').textContent = filename;
    const sizeEl = document.getElementById('modal-filesize');
    if (sizeEl) {
        sizeEl.textContent = `${(new Blob([content]).size / 1024).toFixed(1)} KB`;
    }

    document.getElementById('modal-preview-pane').innerHTML = renderMarkdown(content);
    document.getElementById('modal-raw-pane').textContent = content;

    switchModalTab('preview');
    document.getElementById('modal').classList.add('open');
}

export function switchModalTab(tab) {
    currentModalTab = tab;
    const isPreview = tab === 'preview';
    document.getElementById('modal-preview-pane').style.display = isPreview ? 'block' : 'none';
    document.getElementById('modal-raw-pane').style.display = isPreview ? 'none' : 'block';
    document.getElementById('tab-preview').classList.toggle('active', isPreview);
    document.getElementById('tab-raw').classList.toggle('active', !isPreview);
}

export function renderSkeletonCards(count) {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;
    grid.innerHTML = Array(count).fill(0).map(() => `
    <div class="agent-card skeleton">
      <div class="agent-card-header">
        <div class="agent-avatar"></div>
        <div class="agent-card-meta">
          <div class="agent-name"></div>
          <div class="agent-role"></div>
        </div>
      </div>
      <div class="agent-card-body">
        <div class="agent-desc"></div>
      </div>
    </div>
  `).join('');
}
