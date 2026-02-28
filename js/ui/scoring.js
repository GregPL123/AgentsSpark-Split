/**
 * AgentSpark Scoring Panel UI
 */
import { state, t } from '../core/state.js';

/**
 * Renders the project scoring metrics and risks
 */
export function renderScoring(data) {
    if (!data) return;
    const panel = document.getElementById('scoring-panel');
    if (!panel) return;
    panel.style.display = 'block';

    const scoreColor = data.overallScore >= 75 ? 'var(--accent2)' : data.overallScore >= 50 ? '#f59e0b' : 'var(--success)';
    const isWarn = data.levelMatch !== 'ok';
    const suggestedLvl = t().levels.find(l => l.id === data.suggestedLevel);

    const _metricInfo = {
        'Technical Complexity': { low: '0–40: Simple tech stack, mostly standard tools.', mid: '40–70: Custom logic, APIs or real-time features needed.', high: '70–100: Complex architecture, microservices or AI.' },
        'Business Complexity': { low: '0–40: Straightforward model, few stakeholders.', mid: '40–70: Multiple user roles or revenue streams.', high: '70–100: Complex ops, compliance or multi-market.' },
        'Integration Needs': { low: '0–40: Few or no external services required.', mid: '40–70: Several APIs like payments or auth needed.', high: '70–100: Heavy integrations, real-time data sync.' },
        'Scalability Demand': { low: '0–40: Small user base, no scaling pressure.', mid: '40–70: Growth expected, some infrastructure planning.', high: '70–100: High traffic, distributed systems required.' },
    };

    const metricsHTML = (data.metrics || []).map(m => {
        const info = _metricInfo[m.label] || {};
        const tier = m.value < 40 ? info.low : m.value < 70 ? info.mid : info.high;
        const tipId = 'tip-' + m.label.replace(/\s+/g, '-');
        return `
      <div class="score-metric">
        <div class="score-metric-label">
          ${m.label}
          <button class="metric-info-btn" onclick="document.getElementById('${tipId}').classList.toggle('visible')">ℹ️</button>
        </div>
        <div class="metric-tip" id="${tipId}">${tier}</div>
        <div class="score-metric-bar"><div class="score-metric-fill" style="width:0%;background:${m.color}" data-target="${m.value}"></div></div>
        <div class="score-metric-value">${m.value}/100</div>
      </div>
    `;
    }).join('');

    const risksHTML = (data.risks || []).map(r => `<div class="risk-item">${r}</div>`).join('');
    const suggestionIcon = data.levelMatch === 'upgrade' ? '⬆' : data.levelMatch === 'downgrade' ? '⬇' : '✓';

    panel.innerHTML = `
    <div class="scoring-header">
      <h3>${state.lang === 'en' ? 'PROJECT SCORING' : 'OCENA PROJEKTU'}</h3>
      <div class="score-badge">
        <div class="score-number" style="color:${scoreColor}">${data.overallScore}</div>
        <div class="score-label"><strong>${data.overallLabel}</strong> ${state.lang === 'en' ? 'out of 100' : 'na 100'}</div>
      </div>
    </div>
    <div class="scoring-grid">${metricsHTML}</div>
    ${risksHTML ? `<div class="scoring-risks"><h4>${state.lang === 'en' ? '⚠ POTENTIAL RISKS' : '⚠ POTENCJALNE RYZYKA'}</h4>${risksHTML}</div>` : ''}
    <div class="level-suggestion ${isWarn ? 'warn' : ''}">
      <span class="ls-icon">${suggestionIcon}</span>
      <span>${data.levelSuggestion}${suggestedLvl && isWarn ? ' <strong>→ ' + suggestedLvl.name + '</strong>' : ''}</span>
    </div>
  `;

    // Trigger bar animations
    requestAnimationFrame(() => {
        panel.querySelectorAll('.score-metric-fill').forEach(bar => {
            setTimeout(() => { bar.style.width = (bar.dataset.target || 0) + '%'; }, 100);
        });
    });
}
