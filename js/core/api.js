/**
 * AgentSpark AI API Communication
 */
import { state } from './state.js';
import { FALLBACK_CHAINS } from './constants.js';
import { showNotif } from '../ui/notifications.js';
import { renderTraceLive } from '../ui/trace.js';
import { setTypingStatus } from '../ui/chat.js';

/**
 * Errors that justify trying a fallback (rate limit, overloaded, server error)
 */
export function isFallbackable(status, message) {
    if ([429, 500, 502, 503, 504, 529].includes(status)) return true;
    const msg = (message || '').toLowerCase();
    return msg.includes('rate limit') || msg.includes('overloaded') ||
        msg.includes('capacity') || msg.includes('timeout') ||
        msg.includes('quota') || msg.includes('unavailable');
}

/**
 * Single model call — throws with {status, message} on failure
 */
export async function callSingleModel(m, key, systemInstruction, userMessage, _traceLabel) {
    const { provider, model, endpoint } = m;
    const t0 = Date.now();

    // Register span as pending
    const span = {
        id: state.traceSpans.length,
        label: _traceLabel || 'API Call',
        model: m.label || model,
        provider,
        startMs: t0,
        endMs: null,
        durationMs: null,
        status: 'pending',   // pending | ok | fallback | error
        isFallback: false,
        tokens: null,
        error: null,
    };
    if (!state.traceSessionStart) state.traceSessionStart = t0;
    state.traceSpans.push(span);
    renderTraceLive();  // show pending bar immediately

    const finalize = (status, tokens, error) => {
        span.endMs = Date.now();
        span.durationMs = span.endMs - span.startMs;
        span.status = status;
        span.tokens = tokens || null;
        span.error = error || null;
        renderTraceLive();
    };

    try {
        let result, tokens = null;

        if (provider === 'gemini') {
            const url = endpoint.replace('{model}', model).replace('{key}', key);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const e = new Error(err.error?.message || `Gemini error ${res.status}`);
                e.status = res.status;
                finalize('error', null, e.message);
                throw e;
            }
            const data = await res.json();
            tokens = data.usageMetadata
                ? (data.usageMetadata.totalTokenCount || null)
                : null;
            result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

        else if (provider === 'openai') {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userMessage }],
                    temperature: 0.8, max_tokens: 4096
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const e = new Error(err.error?.message || `API error ${res.status}`);
                e.status = res.status;
                finalize('error', null, e.message);
                throw e;
            }
            const data = await res.json();
            tokens = data.usage?.total_tokens || null;
            result = data.choices?.[0]?.message?.content || '';
        }

        else if (provider === 'anthropic') {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model,
                    system: systemInstruction,
                    messages: [{ role: 'user', content: userMessage }],
                    max_tokens: 4096
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const e = new Error(err.error?.message || `Anthropic error ${res.status}`);
                e.status = res.status;
                finalize('error', null, e.message);
                throw e;
            }
            const data = await res.json();
            tokens = data.usage ? (data.usage.input_tokens + data.usage.output_tokens) : null;
            result = data.content?.[0]?.text || '';
        }

        else {
            const e = new Error(`Unknown provider: ${provider}`);
            finalize('error', null, e.message);
            throw e;
        }

        finalize('ok', tokens, null);
        return result;

    } catch (err) {
        if (span.status === 'pending') finalize('error', null, err.message);
        throw err;
    }
}

/**
 * Main entry — tries selected model, then falls back through chain
 */
export async function callGemini(systemInstruction, userMessage, traceLabel) {
    const key = state.apiKey || document.getElementById('apiKeyInput')?.value?.trim();
    if (!key) throw new Error('No API key — please enter your key');

    // Build attempt list: selected model first, then rest of its chain
    const chain = FALLBACK_CHAINS[state.selectedModel.tag] || [];
    const primary = { ...state.selectedModel };
    const rest = chain.filter(m => m.model !== primary.model);
    const attempts = [primary, ...rest];

    let lastError = null;
    for (let i = 0; i < attempts.length; i++) {
        const m = attempts[i];
        const spanLabel = traceLabel
            ? (i > 0 ? `${traceLabel} (fallback)` : traceLabel)
            : (i > 0 ? `Fallback #${i}` : 'API Call');

        if (i > 0) {
            setTypingStatus(`⚠ ${attempts[i - 1].label || attempts[i - 1].model} failed — trying ${m.label || m.model}…`);
            await new Promise(r => setTimeout(r, 600)); // brief pause before retry
        }
        try {
            const result = await callSingleModel(m, key, systemInstruction, userMessage, spanLabel);

            if (i > 0) {
                const span = state.traceSpans[state.traceSpans.length - 1];
                if (span) { span.status = 'fallback'; span.isFallback = true; }
                renderTraceLive();
                const modelName = m.label || m.model;
                setTimeout(() => showNotif(
                    state.lang === 'en'
                        ? `↩ Fell back to ${modelName}`
                        : `↩ Przełączono na ${modelName}`
                ), 300);
                // Update header badge
                const badgeEl = document.getElementById('headerModelBadge');
                if (badgeEl) badgeEl.textContent = m.model + ' (fallback)';
            }
            setTypingStatus('');
            return result;
        } catch (err) {
            lastError = err;
            const fallbackable = isFallbackable(err.status, err.message);
            if (!fallbackable) {
                console.warn(`[AgentSpark] Non-fallbackable error on ${m.model}:`, err.message);
                break;
            }
            console.warn(`[AgentSpark] Fallback triggered (${m.model}): ${err.message}`);
        }
    }

    setTypingStatus('');
    throw lastError || new Error('All models failed');
}
