/**
 * AgentSpark Content Generation (Agents & Scoring)
 */
import { state, t } from '../core/state.js';
import { callGemini } from '../core/api.js';
import { addMessage, setTypingStatus, renderProgressSteps } from '../ui/chat.js';
import { showResults } from '../ui/results.js';

/**
 * Trigger the AI generation of the agent team based on the chat history
 */
export async function generateAgents() {
    setTypingStatus(true);
    const history = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
    const prompt = `Here is the complete interview:\n${history}\n\n[GENERATE]\nGenerate the agent team JSON now based on the interview.`;

    try {
        const levelData = t().levels.find(l => l.id === state.currentLevel) || t().levels[0];
        const systemPrompt = `You are a system architect. Respond with a JSON object ONLY. 
    Format: { "agents": [{ "id", "name", "emoji", "type", "role", "description", "agentMd", "skillMd" }], "teamConfig" }`;

        const raw = await callGemini(systemPrompt, prompt, `⚡ Generate Team · ${levelData.agentCount} agents · ${state.currentLevel}`);
        setTypingStatus(false);

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Could not parse agent data');
        const data = JSON.parse(jsonMatch[0]);

        state.generatedAgents = data.agents || [];
        state.generatedFiles = {};

        state.generatedAgents.forEach(a => {
            state.generatedFiles[`agent-${a.id}.md`] = a.agentMd || `# Agent: ${a.name}\n\n**Role:** ${a.role || ''}\n\n${a.description || ''}`;
            state.generatedFiles[`skill-${a.id}.md`] = a.skillMd || `# Skill: ${a.name}\n\n## Capabilities\n\n${a.description || ''}`;
        });
        state.generatedFiles['team-config.md'] = data.teamConfig || `# Team Configuration\n\n**Project:** ${state.currentTopic}\n\n## Agents\n\n${state.generatedAgents.map(a => `- **${a.name}** (${a.role || a.id})`).join('\n')}`;
        state.generatedFiles['README.md'] = generateReadme();

        // Trigger scoring in background
        generateScoring(history).then(scoreData => {
            window._scoringData = scoreData;
            if (typeof window.renderScoring === 'function') window.renderScoring(scoreData);
        });

        renderProgressSteps(3);
        addMessage('ai', state.lang === 'en'
            ? `✅ Done! I've designed ${state.generatedAgents.length} specialized agents for your "${state.currentTopic}" app. Files are ready — switching to results!`
            : `✅ Gotowe! Zaprojektowałem ${state.generatedAgents.length} wyspecjalizowanych agentów dla Twojej aplikacji "${state.currentTopic}". Pliki gotowe — przechodzę do wyników!`
        );

        setTimeout(() => {
            state.versionHistory = [];
            state.versionHistory.push({
                id: Date.now(),
                label: state.lang === 'en' ? `Original team — ${state.currentTopic}` : `Oryginalny zespół — ${state.currentTopic}`,
                ts: new Date(),
                agents: JSON.parse(JSON.stringify(state.generatedAgents)),
                files: JSON.parse(JSON.stringify(state.generatedFiles)),
                diff: { added: [], removed: [], changed: [] },
                removedNames: {},
                agentNames: Object.fromEntries(state.generatedAgents.map(a => [a.id, a.name])),
                vNum: 1,
                isOrigin: true,
            });
            showResults();
        }, 1800);
    } catch (err) {
        setTypingStatus(false);
        addMessage('ai', `Generation error: ${err.message}. Please try again.`);
    }
}

/**
 * Generate a project complexity score based on chat history
 */
export async function generateScoring(history) {
    const lvl = t().levels.find(l => l.id === state.currentLevel);
    const prompt = `As a project analyst, score the following project interview for complexity.
  Respond ONLY with JSON: { "overallScore", "overallLabel", "metrics": [], "risks": [], "levelMatch", "suggestedLevel" }.
  Interview:\n${history}`;

    try {
        const raw = await callGemini('You are a scoring bot. Return JSON only.', prompt, '📊 Scoring · Complexity analysis');
        const match = raw.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
    } catch (e) {
        console.warn('Scoring failed:', e);
        return null;
    }
}

/**
 * Generate a README.md overview for the agent team
 */
export function generateReadme() {
    const technical = state.generatedAgents.filter(a => a.type === 'technical');
    const business = state.generatedAgents.filter(a => a.type !== 'technical');
    const techList = technical.map(a => `- **${a.name}** [TECHNICAL] (${a.role}): ${a.description}`).join('\n');
    const bizList = business.map(a => `- **${a.name}** [BUSINESS] (${a.role}): ${a.description}`).join('\n');
    const lvl = t().levels.find(l => l.id === state.currentLevel);

    return `# AgentSpark — Generated Team\n\n**Project:** ${state.currentTopic}\n**Level:** ${lvl ? lvl.name : state.currentLevel}\n**Generated:** ${new Date().toLocaleString()}\n**Language:** ${state.lang.toUpperCase()}\n\n## ⚙️ Technical Agents\n\n${techList || 'none'}\n\n## 💼 Business Agents\n\n${bizList || 'none'}\n\n## Files\n\n${Object.keys(state.generatedFiles).filter(f => f !== 'README.md').map(f => `- \`${f}\``).join('\n')}\n\n## How to use\n\nSee instructions inside the app or visit antigravity.google\n`;
}
