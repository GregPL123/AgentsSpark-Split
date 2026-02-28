/**
 * AgentSpark Topic & Level Selection UI
 */
import { state, t } from '../core/state.js';
import { MODEL_KEY_HINTS } from '../core/constants.js';
import { showNotif } from './notifications.js';
import { startChat } from '../app/chat.js';

/**
 * Render the complexity level selection grid
 */
export function renderLevelGrid() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;
    grid.innerHTML = '';

    t().levels.forEach(lvl => {
        const div = document.createElement('div');
        div.className = 'level-card' + (state.currentLevel === lvl.id ? ' active' : '');
        div.innerHTML = `
      <div class="level-emoji">${lvl.emoji}</div>
      <div class="level-name" style="color:${lvl.color}">${lvl.name}</div>
      <div class="level-tagline">${lvl.tagline}</div>
      <div class="level-agent-count">👥 ${lvl.agentCount} ${state.lang === 'en' ? 'specialized agents' : 'agentów'}</div>
    `;
        div.onclick = () => {
            state.currentLevel = lvl.id;
            renderLevelGrid();
        };
        div.tabIndex = 0;
        div.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); } };
        grid.appendChild(div);
    });
}

/**
 * Render the entire topic selection screen
 */
export function renderTopicScreen() {
    renderLevelGrid();

    // Update static texts
    const els = {
        'badge-text': 'badge',
        'hero-title': 'heroTitle',
        'hero-sub': 'heroSub',
        'or-text': 'orText',
        'start-btn': 'startBtn'
    };

    for (const [id, key] of Object.entries(els)) {
        const el = document.getElementById(id);
        if (el) {
            if (key === 'heroTitle') el.innerHTML = t()[key];
            else el.textContent = t()[key];
        }
    }

    // Categories as iOS segmented control
    const filtersEl = document.getElementById('template-filters');
    if (filtersEl) {
        filtersEl.innerHTML = '';
        const seg = document.createElement('div');
        seg.className = 'ios-segmented';

        t().topicCats.slice(0, 5).forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'ios-seg-btn' + (state.activeTopicCat === cat.id ? ' active' : '');
            btn.textContent = cat.label;
            btn.onclick = () => {
                state.activeTopicCat = cat.id;
                renderTopicScreen();
            };
            seg.appendChild(btn);
        });
        filtersEl.appendChild(seg);
    }

    // Topic cards
    const grid = document.getElementById('topic-grid');
    if (grid) {
        grid.innerHTML = '';
        t().topics.forEach(topic => {
            const div = document.createElement('div');
            div.className = 'topic-card' + (state.activeTopicCat !== 'all' && topic.cat !== state.activeTopicCat ? ' hidden' : '');
            div.innerHTML = `
        <div class="time-badge">${topic.time}</div>
        <div class="icon">${topic.icon}</div>
        <div class="label">${topic.label}</div>
        <div class="sub">${topic.sub}</div>
        <div class="agents-preview">⚡ ${topic.agents}</div>
      `;
            div.onclick = () => {
                const input = document.getElementById('customTopic');
                if (input) input.value = topic.label;
                startWithTopic();
            };
            div.tabIndex = 0;
            div.setAttribute('role', 'button');
            div.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); } };
            grid.appendChild(div);
        });
    }
}

/**
 * Handle starting the process with the selected/entered topic
 */
export function startWithTopic() {
    const keyVal = document.getElementById('apiKeySetupInput')?.value.trim();
    state.apiKey = keyVal;

    if (!state.apiKey || state.apiKey.length < 10) {
        const hint = MODEL_KEY_HINTS[state.selectedModel.tag]?.label || 'API key';
        showNotif(state.lang === 'en' ? `⚠ Please enter a valid ${hint}` : `⚠ Podaj prawidłowy klucz ${hint}`, true);
        return;
    }

    const topic = document.getElementById('customTopic')?.value.trim();
    if (!topic) {
        showNotif(state.lang === 'en' ? '⚠ Please select or enter a topic' : '⚠ Wybierz lub wpisz temat', true);
        return;
    }

    state.currentTopic = topic;
    startChat();
}
