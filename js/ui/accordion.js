/**
 * AgentSpark Accordion UI
 */

/**
 * Toggle an accordion item open/closed
 */
export function toggleAccordion(item) {
    const isOpen = item.classList.contains('open');
    // Optional: Close others in same container
    const container = item.parentElement;
    if (container) {
        container.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
    }
    if (!isOpen) item.classList.add('open');
}

/**
 * Render a list of steps as an accordion
 */
export function renderAccordionInstructions(steps) {
    const container = document.getElementById('instr-steps');
    if (!container) return;
    container.innerHTML = '';
    steps.forEach((step, i) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';
        item.innerHTML = `
      <div class="accordion-header" onclick="toggleAccordion(this.parentElement)" role="button" tabindex="0"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleAccordion(this.parentElement)}">
        <div class="accordion-num">0${i + 1}</div>
        <div class="accordion-title">${step.title}</div>
        <span class="accordion-chevron">▾</span>
      </div>
      <div class="accordion-body">
        <div class="accordion-content">${step.body}</div>
      </div>
    `;
        container.appendChild(item);
    });
    // Open first by default
    if (container.firstElementChild) {
        toggleAccordion(container.firstElementChild);
    }
}
