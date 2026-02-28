/**
 * AgentSpark File Downloads (ZIP Generation)
 */
import { state } from '../core/state.js';
import { showNotif } from '../ui/notifications.js';

/**
 * Generates and downloads a ZIP file containing the agent team and manifest
 */
export async function downloadZip() {
    // JSZip is expected to be loaded via CDN in index.html
    if (typeof window.JSZip === 'undefined') {
        showNotif('JSZip not loaded', true);
        return;
    }

    const zip = new window.JSZip();

    // Add generated files
    Object.entries(state.generatedFiles).forEach(([name, content]) => {
        zip.file(name, content);
    });

    // Embed project manifest for lossless re-import
    const manifest = {
        v: 2,
        source: 'agentspark',
        topic: state.currentTopic,
        level: state.currentLevel,
        lang: state.lang,
        agents: state.generatedAgents,
        files: state.generatedFiles,
        ts: Date.now(),
    };

    zip.file('agentspark.json', JSON.stringify(manifest, null, 2));

    try {
        const blob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `agentspark-${state.currentTopic.toLowerCase().replace(/\s+/g, '-')}.zip`;
        a.click();

        // Clean up URL object after small delay
        setTimeout(() => URL.revokeObjectURL(url), 100);

        showNotif(
            state.lang === 'en'
                ? '✓ ZIP downloaded successfully!'
                : '✓ ZIP pobrany pomyślnie!'
        );
    } catch (e) {
        console.error('[AgentSpark] ZIP generation failed:', e);
        showNotif('⚠ ZIP failed: ' + e.message, true);
    }
}
