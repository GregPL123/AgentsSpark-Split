/**
 * AgentSpark Swipe Gestures (Mobile Project Cards)
 */
export function initSwipeGestures() {
    const list = document.getElementById('projects-list');
    if (!list || window.innerWidth > 768) return;

    let startX = 0, startY = 0, currentCard = null;
    const SWIPE_THRESHOLD = 60;
    const MAX_SWIPE = 216; // 3 × 72px (Open, Fork, Delete)

    list.addEventListener('touchstart', e => {
        const wrap = e.target.closest('.project-card-wrap');
        if (!wrap) return;
        currentCard = wrap.querySelector('.project-card');
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        if (currentCard) currentCard.style.transition = 'none';
    }, { passive: true });

    list.addEventListener('touchmove', e => {
        if (!currentCard) return;
        const dx = e.touches[0].clientX - startX;
        const dy = Math.abs(e.touches[0].clientY - startY);

        if (dy > 12) { currentCard = null; return; } // Vertical scroll wins
        if (dx >= 0) { // Only left swipe allowed
            currentCard.style.transform = 'translateX(0)';
            return;
        }
        const travel = Math.min(Math.abs(dx), MAX_SWIPE);
        currentCard.style.transform = `translateX(-${travel}px)`;
    }, { passive: true });

    list.addEventListener('touchend', e => {
        if (!currentCard) return;
        const dx = e.changedTouches[0].clientX - startX;
        currentCard.style.transition = '';
        if (dx < -SWIPE_THRESHOLD) {
            currentCard.style.transform = `translateX(-${MAX_SWIPE}px)`;
        } else {
            currentCard.style.transform = 'translateX(0)';
        }
        currentCard = null;
    }, { passive: true });

    // Tap elsewhere closes open swipes
    document.addEventListener('touchstart', e => {
        if (!e.target.closest('.project-card-wrap')) {
            list.querySelectorAll('.project-card').forEach(c => {
                c.style.transition = '';
                c.style.transform = 'translateX(0)';
            });
        }
    }, { passive: true });
}
