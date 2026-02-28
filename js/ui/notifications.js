/**
 * AgentSpark UI Notifications
 */

let notifTimeout;

/**
 * Show a toast notification
 * @param {string} msg - Message to display
 * @param {boolean} isError - Whether it's an error notification
 */
export function showNotif(msg, isError = false) {
    // Remove any existing toast with fade-out
    const old = document.querySelector('.notif');
    if (old) {
        old.classList.add('hiding');
        setTimeout(() => old.remove(), 260);
    }

    const div = document.createElement('div');
    div.className = 'notif' + (isError ? ' error' : '');

    // Icon prefix for context
    const icon = isError ? '⚠ ' : '';
    div.textContent = icon + msg;

    // Color tint for success vs error
    if (isError) {
        div.style.color = 'var(--accent2)';
    } else if (msg.startsWith('✓') || msg.startsWith('↩')) {
        div.style.color = 'var(--success)';
    } else {
        div.style.color = 'var(--text)';
    }

    document.body.appendChild(div);

    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => {
        div.classList.add('hiding');
        setTimeout(() => div.remove(), 260);
    }, 3200);
}
