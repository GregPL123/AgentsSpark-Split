/**
 * AgentSpark Team Refinement UI
 */
import { state, t } from '../core/state.js';
import { renderMarkdown } from '../frameworks/markdown.js';

/**
 * Open the refinement panel and initialize its state
 */
export function openRefine() {
    const panel = document.getElementById('refine-panel');
    if (!panel) return;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Update text labels
    const textMapping = {
        'refine-title': 'refineTitle',
        'refine-sub': 'refineSub',
        'refine-submit-label': 'refineApply'
    };

    for (const [id, key] of Object.entries(textMapping)) {
        const el = document.getElementById(id);
        if (el) el.textContent = t()[key];
    }

    const input = document.getElementById('refine-input');
    if (input) {
        input.placeholder = t().refinePlaceholder;
        input.value = '';
    }

    // Reset steps visibility
    const s1 = document.getElementById('refine-step1');
    const s2 = document.getElementById('refine-step2');
    if (s1) s1.style.display = 'block';
    if (s2) s2.style.display = 'none';

    const applyBtn = document.getElementById('refine-apply-btn');
    if (applyBtn) applyBtn.style.display = 'none';

    const historyEl = document.getElementById('refine-history');
    if (historyEl) historyEl.innerHTML = '';

    _renderActionChips();
}

/**
 * Handle chipping between refinement actions
 */
function _renderActionChips() {
    const chips = document.getElementById('refine-action-chips');
    if (!chips) return;
    chips.innerHTML = '';

    t().refineActions.forEach(action => {
        const chip = document.createElement('button');
        chip.className = 'refine-chip' + (state.selectedRefineAction === action.id ? ' active' : '');
        chip.innerHTML = `<span>${action.emoji}</span><span>${action.label}</span>`;
        chip.title = action.desc;

        chip.onclick = () => {
            state.selectedRefineAction = action.id;
            chips.querySelectorAll('.refine-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const input = document.getElementById('refine-input');
            if (input && !input.value.trim()) {
                const hints = {
                    improve: state.lang === 'en' ? 'Improve overall agent descriptions and add specific skills...' : 'Ulepsz opisy agentów i dodaj umiejętności...',
                    add: state.lang === 'en' ? 'Add a [type] agent that handles [responsibility]...' : 'Dodaj agenta [typ] który zajmuje się...',
                    remove: state.lang === 'en' ? 'Remove the [agent name] agent and redistribute duties...' : 'Usuń agenta [nazwa] i rozdziel obowiązki...',
                    connections: state.lang === 'en' ? 'Change connection so [A] sends results to [B]...' : 'Zmień połączenie tak że [A] wysyła wyniki do [B]...'
                };
                input.placeholder = hints[action.id] || t().refinePlaceholder;
            }
        };
        chips.appendChild(chip);
    });
}

/**
 * Add a message to the refinement chat history
 */
export function addRefineMessage(role, text) {
    const hist = document.getElementById('refine-history');
    if (!hist) return;
    const div = document.createElement('div');
    div.className = `refine-msg refine-msg-${role}`;
    div.innerHTML = renderMarkdown(text);
    hist.appendChild(div);
    hist.scrollTop = hist.scrollHeight;
}

/**
 * Show a typing/thinking indicator in the refinement panel
 */
export function addRefineThinking() {
    const hist = document.getElementById('refine-history');
    if (!hist) return;
    const div = document.createElement('div');
    div.id = 'refine-thinking-indicator';
    div.className = 'refine-thinking';
    div.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
    hist.appendChild(div);
    hist.scrollTop = hist.scrollHeight;
}

/**
 * Hide the refinement thinking indicator
 */
export function removeRefineThinking() {
    document.getElementById('refine-thinking-indicator')?.remove();
}

/**
 * Hide the refinement panel
 */
export function closeRefine() {
    const panel = document.getElementById('refine-panel');
    if (panel) panel.style.display = 'none';
}
