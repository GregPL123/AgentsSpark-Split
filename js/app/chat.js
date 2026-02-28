/**
 * AgentSpark Chat & Interview Logic
 */
import { state, t } from '../core/state.js';
import { callGemini } from '../core/api.js';
import { addMessage, setTypingStatus, renderProgressSteps, clearOptions } from '../ui/chat.js';
import { showScreen, updateContextBar } from '../ui/navigation.js';
import { deepClone } from '../core/utils.js';

/**
 * Construct the system prompt for the interview phase
 */
export function getSystemPrompt() {
    const levelData = t().levels.find(l => l.id === state.currentLevel) || t().levels[0];
    const maxQs = state.MAX_QUESTIONS;

    return `You are AgentSpark, an expert AI system designer. Your job is to interview the user about their app idea using CLOSED questions with multiple choice answers.

Language: ${state.lang === 'en' ? 'English' : 'Polish'}
App topic: ${state.currentTopic}
Complexity level: ${levelData.name} — ${levelData.tagline}
Agent count to generate: ${levelData.agentCount}
Focus areas for this level: ${levelData.focus}

INTERVIEW STRUCTURE — ${maxQs} questions total, split into 3 adaptive sections:

SECTION 1 — BUSINESS (first ${Math.ceil(maxQs * 0.3)} questions):
Focus: target users, monetization model, core value proposition, market.

SECTION 2 — FRONTEND (next ${Math.ceil(maxQs * 0.35)} questions):
Focus: UI paradigm, navigation, key user flows, device targets, design priorities.

SECTION 3 — BACKEND (remaining questions):
Focus: data storage, auth, external APIs, scalability, infrastructure.

ADAPTIVE RULES — CRITICAL:
- Each question MUST reference or build on previous answers. Never ask in a vacuum.
- If user chose "mobile-first" → ask about offline mode or push notifications next.
- If user chose "subscription model" → ask about billing provider and free tier strategy.
- If user chose "social login" → ask about user profile data needs.
- Questions must form a coherent decision tree that leads to a buildable specification.
- Calibrate depth: ${levelData.name} level — ${levelData.focus}
- Always track what has been decided and reference it explicitly in the next question.

RESPONSE FORMAT — for EVERY question respond with ONLY this JSON:
{
  "section": "Business" | "Frontend" | "Backend",
  "question": "Your question here?",
  "options": [
    { "label": "A", "text": "Option A text", "impact": "1 sentence consequence" },
    { "label": "B", "text": "Option B text", "impact": "1 sentence consequence" },
    { "label": "C", "text": "Option C text", "impact": "1 sentence consequence" },
    { "label": "D", "text": "Option D text", "impact": "1 sentence consequence" }
  ]
}

After exactly ${maxQs} questions respond with ONLY:
{ "complete": true, "summary": "Coherent 3-4 sentence spec summary." }

IMPORTANT: Pure JSON only.`;
}

/**
 * Initialize the chat screen and start the AI interview
 */
export function startChat() {
    showScreen('chat');
    updateContextBar('chat');

    // Reset session-specific state
    state.traceSpans = [];
    state.tracePanelOpen = false;
    state.traceSessionStart = null;

    const header = document.getElementById('apiKeyHeader');
    if (header) header.style.display = 'flex';
    const input = document.getElementById('apiKeyInput');
    if (input) input.value = state.apiKey;

    const badgeEl = document.getElementById('headerModelBadge');
    if (badgeEl) badgeEl.textContent = state.selectedModel.model;

    const topicEl = document.getElementById('sidebar-topic');
    if (topicEl) topicEl.textContent = state.currentTopic;

    const lvl = t().levels.find(l => l.id === state.currentLevel);
    if (lvl) {
        const sLvl = document.getElementById('sidebar-level');
        const sName = document.getElementById('sidebar-level-name');
        const sDesc = document.getElementById('sidebar-level-desc');
        if (sLvl) sLvl.textContent = lvl.emoji;
        if (sName) {
            sName.textContent = lvl.name;
            sName.style.color = lvl.color;
        }
        if (sDesc) sDesc.textContent = lvl.tagline;
    }

    const cTitle = document.getElementById('chat-title');
    const cSub = document.getElementById('chat-subtitle');
    if (cTitle) cTitle.textContent = t().chatTitle;
    if (cSub) cSub.textContent = t().chatSub;

    renderProgressSteps(0);
    state.chatHistory = [];
    state.questionCount = 0;
    state.conversationState = 'interview';

    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) messagesContainer.innerHTML = '';

    // Initial AI question
    setTypingStatus(true);
    callGemini(getSystemPrompt(), `[START_INTERVIEW] Topic: ${state.currentTopic}. Ask the first question.`, `🎤 Interview · Starting...`)
        .then(reply => {
            setTypingStatus(false);
            state.chatHistory.push({ role: 'ai', text: reply });
            addMessage('ai', reply);

            let parsed = null;
            try {
                const jsonMatch = reply.match(/\{[\s\S]*\}/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            } catch (e) { }

            if (parsed && parsed.question && parsed.options) {
                renderOptions(parsed);
            } else {
                renderOptionsLegacy(reply);
            }
        })
        .catch(err => {
            setTypingStatus(false);
            addMessage('ai', `Error: ${err.message}`);
        });
}

/**
 * Handle user option selection
 */
export function selectOption(label, text) {
    const msgs = document.querySelectorAll('.choices-msg');
    const last = msgs[msgs.length - 1];
    if (last) {
        last.querySelectorAll('.choice-wrap').forEach(w => {
            const card = w.querySelector('.choice-card');
            if (card) {
                if (card.dataset.label === label) {
                    w.classList.add('selected');
                    card.classList.add('selected');
                } else {
                    card.classList.add('disabled');
                }
            }
        });
    }
    // Small delay for visual feedback before submitting
    setTimeout(() => submitAnswer(label + ') ' + text), 400);
}

/**
 * Submit a user answer and trigger the next AI question
 */
export async function submitAnswer(answer) {
    clearOptions();
    addMessage('user', answer);
    state.chatHistory.push({ role: 'user', text: answer });
    state.questionCount++;

    if (state.conversationState === 'interview') {
        setTypingStatus(true);
        try {
            const history = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
            const prompt = `${history}\n\nThis was answer ${state.questionCount} of ${state.MAX_QUESTIONS}. Ask next question or finalize.`;
            const reply = await callGemini(getSystemPrompt(), prompt, `🎤 Interview · Q${state.questionCount} of ${state.MAX_QUESTIONS}`);
            setTypingStatus(false);

            let parsed = null;
            try {
                const jsonMatch = reply.match(/\{[\s\S]*\}/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            } catch (e) { }

            if (parsed && parsed.complete) {
                if (parsed.summary) addMessage('ai', parsed.summary);
                state.chatHistory.push({ role: 'ai', text: parsed.summary || 'Interview complete.' });
                state.conversationState = 'generating';
                renderProgressSteps(1);
                // generateAgents() will be in generations.js
                if (typeof window.generateAgents === 'function') setTimeout(window.generateAgents, 1200);
            } else if (parsed && parsed.question && parsed.options) {
                addMessage('ai', parsed.question);
                state.chatHistory.push({ role: 'ai', text: parsed.question });
                renderOptions(parsed);
            } else {
                // Fallback for non-JSON or mixed replies
                addMessage('ai', reply);
                state.chatHistory.push({ role: 'ai', text: reply });
                if (reply.includes('[INTERVIEW_COMPLETE]') || state.questionCount >= state.MAX_QUESTIONS) {
                    state.conversationState = 'generating';
                    renderProgressSteps(1);
                    if (typeof window.generateAgents === 'function') setTimeout(window.generateAgents, 1200);
                } else {
                    renderOptionsLegacy(reply);
                }
            }
        } catch (err) {
            setTypingStatus(false);
            addMessage('ai', `Error: ${err.message}`);
        }
    }
}

/**
 * Render multiple choice options in the chat
 */
export function renderOptions(parsed) {
    if (!parsed || !parsed.options) return;
    const panel = document.getElementById('question-panel');
    const panelText = document.getElementById('question-panel-text');
    const panelChoices = document.getElementById('question-panel-choices');
    if (!panel || !panelText || !panelChoices) return;

    panelText.textContent = parsed.question || '';
    panelChoices.innerHTML = '';
    parsed.options.forEach(opt => {
        panelChoices.appendChild(_buildChoiceCard(opt.label, opt.text, opt.impact || null));
    });

    panel.style.display = 'flex';
    const chatEl = document.getElementById('chat-messages');
    if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
}

/**
 * Legacy option renderer for unstructured AI responses
 */
export function renderOptionsLegacy(text) {
    const matches = [...text.matchAll(/([A-D])\)\s*(.+?)(?=\n[A-D]\)|$)/gs)];
    if (matches.length === 0) return;
    const panel = document.getElementById('question-panel');
    const panelChoices = document.getElementById('question-panel-choices');
    if (!panel || !panelChoices) return;

    panelChoices.innerHTML = '';
    matches.forEach(m => {
        const label = m[1];
        const full = m[2].trim().replace(/\n/g, ' ');
        const parts = full.split(/\s*\|\s*IMPACT:\s*/i);
        panelChoices.appendChild(_buildChoiceCard(label, parts[0].trim(), parts[1] ? parts[1].trim() : null));
    });
    panel.style.display = 'flex';
}

function _buildChoiceCard(label, optText, impact) {
    const wrap = document.createElement('div');
    wrap.className = 'choice-wrap';

    const card = document.createElement('button');
    card.className = 'choice-card';
    card.dataset.label = label;
    card.innerHTML = `<span class="choice-label">${label}</span><span class="choice-text">${optText}</span>`;

    if (impact) {
        const infoBtn = document.createElement('button');
        infoBtn.className = 'choice-info-btn';
        infoBtn.textContent = 'ℹ️';
        const impactEl = document.createElement('div');
        impactEl.className = 'choice-impact';
        impactEl.textContent = impact;
        infoBtn.onclick = (e) => {
            e.stopPropagation();
            impactEl.classList.toggle('visible');
        };
        card.appendChild(infoBtn);
        wrap.appendChild(card);
        wrap.appendChild(impactEl);
    } else {
        wrap.appendChild(card);
    }

    card.onclick = () => selectOption(label, optText);
    return wrap;
}
