/**
 * AgentSpark Chat Interface UI
 */
import { state } from '../core/state.js';
import { renderMarkdown } from '../frameworks/markdown.js';

/**
 * Update the typing indicator visibility
 */
export function setTypingStatus(isTyping) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.style.display = isTyping ? 'flex' : 'none';
}

/**
 * Update the typing indicator status text specifically
 */
export function setTypingLabel(text) {
    const el = document.getElementById('typing-indicator');
    if (!el) return;
    let label = el.querySelector('.typing-status-label');
    if (!label) {
        label = document.createElement('div');
        label.className = 'typing-status-label';
        label.style.cssText = 'font-size:0.68rem;font-family:"Space Mono",monospace;color:var(--muted);margin-top:0.4rem;';
        el.appendChild(label);
    }
    label.textContent = text;
}

/**
 * Add a message to the chat container
 */
export function addMessage(role, text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `message ${role}-message`;
    div.innerHTML = renderMarkdown(text);
    container.appendChild(div);

    // Smooth scroll to bottom
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

/**
 * Update the multi-step progress track
 */
export function renderProgressSteps(activeIndex) {
    const steps = document.querySelectorAll('.step-track');
    steps.forEach((s, i) => {
        s.classList.toggle('active', i < activeIndex);
        s.classList.toggle('current', i === activeIndex - 1);
    });
}

/**
 * Clear current question choices and hide panel
 */
export function clearOptions() {
    const panel = document.getElementById('question-panel');
    if (panel) panel.style.display = 'none';
    const panelChoices = document.getElementById('question-panel-choices');
    if (panelChoices) panelChoices.innerHTML = '';
}
