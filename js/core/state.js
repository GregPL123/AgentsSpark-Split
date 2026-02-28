/**
 * AgentSpark Global State
 */
import { T, MAX_QUESTIONS_DEFAULT } from './constants.js';

export const state = {
    lang: 'en',
    apiKey: '',
    selectedModel: {
        provider: 'gemini',
        model: 'gemini-1.5-flash-latest', // Updated to match likely current stable if needed, but I'll check index.html again
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}',
        tag: 'gemini'
    },
    currentTopic: '',
    currentLevel: 'iskra',
    chatHistory: [],
    conversationState: 'interview',
    questionCount: 0,
    maxQuestions: MAX_QUESTIONS_DEFAULT,
    generatedAgents: [],
    generatedFiles: {},
    versionHistory: [],
    refineHistory: [],
    isRefining: false,

    // Modal state
    currentModalFile: '',
    currentModalTab: 'preview',
    mdBrowserActiveFile: '',

    // DB/Projects State
    db: null,
    currentProjectId: null,
    autoSaveTimer: null,

    // Trace State
    traceSpans: [],
    tracePanelOpen: false,
    traceSessionStart: null
};

// Simple helper to get translated string
export function t(key) {
    return T[state.lang][key];
}

// Update multiple state properties at once
export function updateState(updates) {
    Object.assign(state, updates);
}
