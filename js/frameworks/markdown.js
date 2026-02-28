/**
 * AgentSpark Markdown Renderer (Custom Regex-based)
 */

/**
 * Renders a subset of Markdown to HTML
 */
export function renderMarkdown(md) {
    if (!md) return '';

    const codeBlocks = [];
    const inlineCodes = [];

    let text = md
        // Fenced code blocks: save content raw, replace with placeholder
        .replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
            const escaped = code.trim()
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const idx = codeBlocks.length;
            codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
            return `\x02CODE_BLOCK_${idx}\x03`;
        })
        // Inline code: save raw, replace with placeholder
        .replace(/`([^`\n]+)`/g, (_, code) => {
            const escaped = code
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const idx = inlineCodes.length;
            inlineCodes.push(`<code>${escaped}</code>`);
            return `\x02INLINE_CODE_${idx}\x03`;
        });

    // Escape remaining HTML in normal text
    text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Apply markdown transformations
    text = text
        // Headings
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr>')
        // Bold + italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic (skip lone asterisks used as list bullets)
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        // Unordered lists
        .replace(/^\s*[-+] (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
        // Blockquotes
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Line-by-line block wrapping
    const outLines = [];
    let inList = false;
    let paraAcc = [];

    const flushPara = () => {
        if (paraAcc.length) {
            outLines.push('<p>' + paraAcc.join('<br>') + '</p>');
            paraAcc = [];
        }
    };
    const flushList = () => {
        if (inList) { outLines.push('</ul>'); inList = false; }
    };

    text.split('\n').forEach(rawLine => {
        const line = rawLine.trim();

        if (!line) {
            flushPara();
            flushList();
            return;
        }

        // Block-level tags / placeholders — emit as-is
        if (line.startsWith('<h') || line.startsWith('<pre') ||
            line.startsWith('<hr') || line.startsWith('<blockquote') ||
            line.startsWith('\x02CODE_BLOCK_')) {
            flushPara();
            flushList();
            outLines.push(line);
            return;
        }

        // List item
        if (line.startsWith('<li>')) {
            flushPara();
            if (!inList) { outLines.push('<ul>'); inList = true; }
            outLines.push(line);
            return;
        }

        // Regular text
        flushList();
        paraAcc.push(line);
    });

    flushPara();
    flushList();

    text = outLines.join('\n');

    // Restore code placeholders
    codeBlocks.forEach((html, i) => {
        text = text.replace(`\x02CODE_BLOCK_${i}\x03`, html);
    });
    inlineCodes.forEach((html, i) => {
        text = text.replace(`\x02INLINE_CODE_${i}\x03`, html);
    });

    return text;
}
