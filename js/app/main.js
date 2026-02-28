/**
 * AgentSpark Main Application Entry Point
 */
import { state, t } from '../core/state.js';
import { initTheme, toggleTheme } from '../ui/theme.js';
import { initModals, closeModal, openPasswordPrompt } from '../ui/modals.js';
import { initSwipeGestures } from '../ui/swipe.js';
import { initPWA } from './pwa.js';
import { loadFromHash, generateShareUrl, loadSharedProject } from './sharing.js';
import {
    showScreen,
    updateContextBar,
    syncBackToTop,
    toggleDrawer,
    openDrawer,
    closeDrawer,
    scrollToTop
} from '../ui/navigation.js';
import { renderTopicScreen, startWithTopic } from '../ui/topics.js';
import { initIOS, initBottomNavHide } from '../ui/ios.js';
import { restart } from '../ui/results.js';
import { openRefine, closeRefine } from '../ui/refine.js';
import { submitRefine, applyRefinement, revertLastRefine, backToRefineStep1 } from './refine.js';
import { selectOption, submitAnswer } from './chat.js';
import { generateAgents, generateScoring } from './generations.js';
import { deleteProject, forkProject, loadProject, saveCurrentProject } from './projects.js';
import { downloadZip } from './downloads.js';
import { previewFile, closeMdBrowser, switchModalTab } from '../ui/results.js';
import { toggleVersionPanel, restoreVersion } from '../ui/versions.js';
import { toggleTracePanel } from '../ui/trace.js';

/**
 * Initialize all systems and global handlers
 */
async function init() {
    // Attach functions to window for onclick handlers in index.html
    // This ensures 100% functionality without rewriting the entire HTML event system
    Object.assign(window, {
        toggleTheme,
        showScreen,
        restart,
        toggleDrawer,
        openDrawer,
        closeDrawer,
        scrollToTop,
        renderTopicScreen,
        startWithTopic,
        selectOption,
        submitAnswer,
        generateAgents,
        openRefine,
        closeRefine,
        submitRefine,
        applyRefinement,
        revertLastRefine,
        backToRefineStep1,
        closeModal,
        openPasswordPrompt,
        generateShareUrl,
        loadSharedProject,
        deleteProject,
        forkProject,
        loadProject,
        saveCurrentProject,
        downloadZip,
        previewFile,
        closeMdBrowser,
        switchModalTab,
        toggleVersionPanel,
        restoreVersion,
        toggleTracePanel
    });

    // Initialize UI systems
    initTheme();
    initModals();
    initPWA();
    initIOS();
    initBottomNavHide();

    // Load initial state from URL hash or show start screen
    const loaded = await loadFromHash();
    if (!loaded) {
        showScreen('topic');
        renderTopicScreen();
    }

    // Global event listeners
    document.addEventListener('DOMContentLoaded', () => {
        updateContextBar(state.currentScreen || 'topic');

        // Desktop keyboard shortcuts
        document.addEventListener('keydown', e => {
            // Cmd/Ctrl+K: Toggle Drawer
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleDrawer();
            }
            // Esc: Close active overlays
            if (e.key === 'Escape') {
                if (state.drawerOpen) closeDrawer();
                closeModal();
                closeRefine();
                closeMdBrowser();
            }
        });

        // Modal backdrop clicks
        document.getElementById('modal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) closeModal();
        });
        document.getElementById('md-browser-modal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) closeMdBrowser();
        });

        // Initialize mobile gestures
        if (window.innerWidth <= 768) {
            initSwipeGestures();
        }
    });

    window.addEventListener('scroll', syncBackToTop, { passive: true });
}

// Start the application
init().catch(err => {
    console.error('[AgentSpark] Fatal initialization error:', err);
});
