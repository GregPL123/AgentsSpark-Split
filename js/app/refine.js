/**
 * AgentSpark Team Refinement Logic
 */
import { state, t } from '../core/state.js';
import { callGemini } from '../core/api.js';
import { addRefineMessage, addRefineThinking, removeRefineThinking, closeRefine } from '../ui/refine.js';
import { showResults } from '../ui/results.js';
import { renderVersionPanel } from '../ui/versions.js';
import { buildGraphFromAgents } from '../ui/graph.js';
import { showNotif } from '../ui/notifications.js';
import { deepClone } from '../core/utils.js';
import { generateReadme } from './generations.js';

let _pendingRefineData = null;

/**
 * Construct the system prompt for the refinement phase
 */
export function getRefineSystemPrompt() {
    const lvl = t().levels.find(l => l.id === state.currentLevel);
    const currentTeamJSON = JSON.stringify(state.generatedAgents.map(a => ({
        id: a.id, name: a.name, type: a.type, role: a.role, description: a.description
    })), null, 2);

    return `You are AgentSpark, an expert AI system designer in REFINE mode.
Language: ${state.lang === 'en' ? 'English' : 'Polish'}
App topic: ${state.currentTopic}
Complexity level: ${lvl ? lvl.name : state.currentLevel}

CURRENT TEAM:
${currentTeamJSON}

The user wants to modify their agent team. Apply their requested changes and return the complete updated team as JSON.

RESPONSE FORMAT — two parts:
1. A brief human-readable summary of what changed (1-3 sentences), using these tags for changes:
   - New agent: <span class="refine-diff-added">+AgentName</span>
   - Removed: <span class="refine-diff-removed">-AgentName</span>  
   - Modified: <span class="refine-diff-changed">~AgentName</span>

2. Then the full updated JSON (same format as original generation):
[UPDATED_TEAM]
{
  "agents": [...complete updated agents array with all fields: id, name, emoji, type, role, description, agentMd, skillMd...],
  "teamConfig": "...updated team config md..."
}

RULES:
- Always return the COMPLETE agents array, not just changed agents
- Keep unchanged agents exactly as they are
- New agents must follow same structure (id, name, emoji, type, role, description, agentMd, skillMd)
- type must be "technical" or "business"
- agentMd and skillMd must be full detailed markdown, not placeholders
- The [UPDATED_TEAM] marker must appear on its own line`;
}

/**
 * Submit a refinement request to the AI
 */
export async function submitRefine() {
    const input = document.getElementById('refine-input');
    const text = input.value.trim();
    if (!text || state.isRefining) return;

    const actionCtx = state.selectedRefineAction ? '[Action: ' + state.selectedRefineAction + '] ' : '';
    const fullRequest = actionCtx + text;

    state.isRefining = true;
    const submitBtn = document.getElementById('refine-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    // UI transition to step 2 (results preview)
    const s1 = document.getElementById('refine-step1');
    const s2 = document.getElementById('refine-step2');
    if (s1) s1.style.display = 'none';
    if (s2) s2.style.display = 'block';

    addRefineMessage('user', text);
    addRefineThinking();

    try {
        const history = state.refineHistory.map(m => (m.role === 'user' ? 'User' : 'AI') + ': ' + m.text).join('\n');
        const prompt = history ? `Previous context:\n${history}\n\nNew request: ${fullRequest}` : `Request: ${fullRequest}`;

        const emojis = { improve: '⚡', add: '➕', remove: '🗑', connections: '🔗' };
        const emoji = emojis[state.selectedRefineAction] || '✏️';
        const ver = state.versionHistory.length + 1;

        const raw = await callGemini(getRefineSystemPrompt(), prompt, `${emoji} Refine · v${ver}`);
        removeRefineThinking();

        const markerIdx = raw.indexOf('[UPDATED_TEAM]');
        let summary = '', jsonPart = '';
        if (markerIdx !== -1) {
            summary = raw.slice(0, markerIdx).trim();
            jsonPart = raw.slice(markerIdx + '[UPDATED_TEAM]'.length).trim();
        } else {
            const jm = raw.match(/\{[\s\S]*"agents"[\s\S]*\}/);
            if (jm) {
                jsonPart = jm[0];
                summary = raw.slice(0, raw.indexOf(jm[0])).trim() || (state.lang === 'en' ? 'Team updated.' : 'Zespół zaktualizowany.');
            } else {
                throw new Error(state.lang === 'en' ? 'Could not parse updated team.' : 'Nie udało się przetworzyć zaktualizowanego zespołu.');
            }
        }

        const jm2 = jsonPart.match(/\{[\s\S]*\}/);
        if (!jm2) throw new Error('No JSON in response');
        const data = JSON.parse(jm2[0]);

        const prevIds = new Set(state.generatedAgents.map(a => a.id));
        const newIds = new Set(data.agents.map(a => a.id));
        const addedIds = [...newIds].filter(id => !prevIds.has(id));
        const removedIds = [...prevIds].filter(id => !newIds.has(id));
        const changedIds = [...newIds].filter(id => prevIds.has(id) && JSON.stringify(data.agents.find(a => a.id === id)) !== JSON.stringify(state.generatedAgents.find(a => a.id === id)));
        const removedNames = Object.fromEntries(removedIds.map(id => [id, state.generatedAgents.find(a => a.id === id)?.name || id]));

        const diffBadges = [
            ...addedIds.map(id => '<span class="refine-diff-added">+' + (data.agents.find(a => a.id === id)?.name || id) + '</span>'),
            ...removedIds.map(id => '<span class="refine-diff-removed">-' + removedNames[id] + '</span>'),
            ...changedIds.map(id => '<span class="refine-diff-changed">~' + (data.agents.find(a => a.id === id)?.name || id) + '</span>'),
        ].join(' ');

        addRefineMessage('ai', (summary || '') + (diffBadges ? '<br/><br/>' + diffBadges : ''));
        _pendingRefineData = { data, text, fullRequest, addedIds, removedIds, changedIds, removedNames, summary };

        const applyBtn = document.getElementById('refine-apply-btn');
        if (applyBtn) {
            applyBtn.style.display = 'inline-flex';
            const label = document.getElementById('refine-apply-label');
            if (label) label.textContent = t().refineApply;
        }
    } catch (err) {
        removeRefineThinking();
        addRefineMessage('ai', '<span style="color:var(--accent2)">⚠ ' + err.message + '</span>');
        showNotif(state.lang === 'en' ? '⚠ Refine failed.' : '⚠ Błąd generowania.', true);
        _pendingRefineData = null;
    } finally {
        state.isRefining = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

/**
 * Apply the pending refinement to the current state and history
 */
export function applyRefinement() {
    if (!_pendingRefineData) return;
    const { data, text, fullRequest, addedIds, removedIds, changedIds, removedNames, summary } = _pendingRefineData;
    _pendingRefineData = null;

    state.refineSnapshots.push(deepClone({ agents: state.generatedAgents, files: state.generatedFiles }));

    state.generatedAgents = data.agents;
    data.agents.forEach(a => {
        state.generatedFiles['agent-' + a.id + '.md'] = a.agentMd || '# Agent: ' + a.name + '\n\n**Role:** ' + (a.role || '') + '\n\n' + (a.description || '');
        state.generatedFiles['skill-' + a.id + '.md'] = a.skillMd || '# Skill: ' + a.name + '\n\n## Capabilities\n\n' + (a.description || '');
    });
    removedIds.forEach(id => {
        delete state.generatedFiles['agent-' + id + '.md'];
        delete state.generatedFiles['skill-' + id + '.md'];
    });
    if (data.teamConfig) state.generatedFiles['team-config.md'] = data.teamConfig;
    state.generatedFiles['README.md'] = generateReadme();

    state.refineHistory.push({ role: 'user', text: fullRequest });
    state.refineHistory.push({ role: 'ai', text: summary });

    const nextVerNum = state.versionHistory.length + 1;
    state.versionHistory.push({
        id: Date.now(),
        label: text.length > 60 ? text.slice(0, 57) + '…' : text,
        ts: new Date(),
        agents: deepClone(state.generatedAgents),
        files: deepClone(state.generatedFiles),
        diff: { added: addedIds, removed: removedIds, changed: changedIds },
        removedNames,
        agentNames: Object.fromEntries(data.agents.map(a => [a.id, a.name])),
        vNum: nextVerNum,
    });

    renderVersionPanel();
    closeRefine();
    showResults(true);

    // Highlighting updates for UX
    setTimeout(() => {
        addedIds.forEach(id => { const c = document.querySelector('[data-agent-id="' + id + '"]'); if (c) c.classList.add('just-added'); });
        changedIds.forEach(id => { const c = document.querySelector('[data-agent-id="' + id + '"]'); if (c) c.classList.add('just-updated'); });
    }, 150);
    setTimeout(() => buildGraphFromAgents(), 300);
    showNotif(state.lang === 'en' ? '✓ Team updated!' : '✓ Zespół zaktualizowany!');

    const revertBtn = document.getElementById('refine-revert-btn');
    if (revertBtn) revertBtn.style.display = 'inline-flex';
}

/**
 * Revert the last successful refinement
 */
export function revertLastRefine() {
    if (!state.refineSnapshots.length) return;
    const snap = state.refineSnapshots.pop();
    state.generatedAgents = snap.agents;
    state.generatedFiles = snap.files;
    state.refineHistory = state.refineHistory.slice(0, -2);

    showResults(true);
    buildGraphFromAgents();
    addRefineMessage('ai', state.lang === 'en' ? '↩ Reverted to previous version.' : '↩ Przywrócono poprzednią wersję.');
    showNotif(state.lang === 'en' ? '↩ Reverted.' : '↩ Przywrócono.');
}

/**
 * Reset refinement UI to step 1
 */
export function backToRefineStep1() {
    _pendingRefineData = null;
    document.getElementById('refine-step1').style.display = 'block';
    document.getElementById('refine-step2').style.display = 'none';
    const applyBtn = document.getElementById('refine-apply-btn');
    if (applyBtn) applyBtn.style.display = 'none';
    const hist = document.getElementById('refine-history');
    if (hist) hist.innerHTML = '';
    const input = document.getElementById('refine-input');
    if (input) input.focus();
}
