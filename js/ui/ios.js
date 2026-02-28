/**
 * AgentSpark iOS-specific UI Enhancements
 */

/**
 * Initialize iOS-style interactions: swipe-to-dismiss sheets and spring animations
 */
export function initIOS() {
    let startY = 0, sheetEl = null, overlayEl = null, isDragging = false;

    // Swipe-down to dismiss sheets
    document.addEventListener('touchstart', (e) => {
        const overlay = e.target.closest('.modal-overlay.open, .ios-sheet-overlay.open');
        if (!overlay) return;

        const sheet = overlay.querySelector('.modal, .share-modal, .fw-modal, .ios-sheet');
        if (!sheet) return;

        const touch = e.touches[0];
        const sheetRect = sheet.getBoundingClientRect();
        const touchRelY = touch.clientY - sheetRect.top;
        const scrollable = e.target.closest('.modal-body, .ios-sheet-body, .fw-body');

        // Check if we should allow dragging
        if (scrollable && scrollable.scrollTop > 0) return;
        if (touchRelY > 80 && !e.target.closest('.modal::before')) {
            if (touchRelY > 80 && scrollable) return;
        }

        startY = touch.clientY;
        sheetEl = sheet;
        overlayEl = overlay;
        isDragging = true;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging || !sheetEl) return;
        const delta = e.touches[0].clientY - startY;
        if (delta > 0) {
            // Resistance curve for dragging
            sheetEl.style.transform = `translateY(${Math.pow(delta, 0.8)}px)`;
            sheetEl.style.transition = 'none';
            overlayEl.style.background = `rgba(0,0,0,${Math.max(0, 0.55 - delta / 400)})`;
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!isDragging || !sheetEl) return;
        const delta = e.changedTouches[0].clientY - startY;
        sheetEl.style.transition = '';
        overlayEl.style.background = '';

        if (delta > 80) {
            // Dismiss if dragged far enough
            sheetEl.style.transform = 'translateY(100%)';
            setTimeout(() => {
                const closeBtn = overlayEl.querySelector('.modal-close');
                if (closeBtn) closeBtn.click();
                else overlayEl.classList.remove('open');
                if (sheetEl) sheetEl.style.transform = '';
            }, 280);
        } else {
            // Reset position
            sheetEl.style.transform = '';
        }
        isDragging = false;
        sheetEl = null;
        overlayEl = null;
    }, { passive: true });

    // Spring animations on tab icons via JS for premium feel
    document.querySelectorAll('.ios-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.querySelectorAll('.tab-icon').forEach(icon => {
                icon.style.transition = 'none';
                icon.style.transform = 'scale(0.78)';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        icon.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
                        icon.style.transform = '';
                    });
                });
            });
        });
    });
}

/**
 * Initialize bottom navigation auto-hide on scroll for mobile devices
 */
export function initBottomNavHide() {
    let lastScroll = 0;
    let tabHidden = false;
    const THRESHOLD = 6;  // Minimum scroll delta
    const SHOW_ZONE = 80; // Distance from bottom where bar always shows

    window.addEventListener('scroll', () => {
        if (window.innerWidth > 768) return; // Only mobile

        const now = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const nearBottom = maxScroll - now < SHOW_ZONE;
        const delta = now - lastScroll;
        lastScroll = now;

        const tabBar = document.getElementById('ios-tab-bar');
        const ctxBar = document.getElementById('sticky-context-bar');
        if (!tabBar) return;

        if (nearBottom || now < 60) {
            // Always show near extremities
            if (tabHidden) {
                tabHidden = false;
                tabBar.classList.remove('hidden-by-scroll');
                ctxBar?.classList.remove('tab-hidden');
            }
        } else if (delta > THRESHOLD && !tabHidden) {
            // Scrolling down -> hide
            tabHidden = true;
            tabBar.classList.add('hidden-by-scroll');
            ctxBar?.classList.add('tab-hidden');
        } else if (delta < -THRESHOLD && tabHidden) {
            // Scrolling up -> show
            tabHidden = false;
            tabBar.classList.remove('hidden-by-scroll');
            ctxBar?.classList.remove('tab-hidden');
        }
    }, { passive: true });
}
