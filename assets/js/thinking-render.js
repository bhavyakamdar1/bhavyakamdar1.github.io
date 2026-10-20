// Shared card renderer for the Thinking posts (home section + /thinking/ page).
const THINKING_LI_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21h-4V9Z"/></svg>';

function thinkingCardHTML(p, root) {
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = typeof p.image === 'string' ? { src: p.image } : p.image;
  const aria = 'aria-label="Open on LinkedIn" tabindex="-1" target="_blank" rel="noopener"';
  return `<div class="thinking-card">
    <a class="speaking-hit" href="${esc(p.link)}" ${aria}><img class="press-image" src="${esc(root + img.src)}" alt="" loading="lazy"></a>
    <a class="speaking-hit" href="${esc(p.link)}" ${aria}><p class="thinking-excerpt">${esc(p.excerpt)}</p></a>
    <a class="li-btn" href="${esc(p.link)}" target="_blank" rel="noopener" aria-label="Read the full post on LinkedIn" title="Read the full post on LinkedIn">${THINKING_LI_ICON}</a>
  </div>`;
}
