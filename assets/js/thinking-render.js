// Shared card renderer for the Thinking posts (home section + /thinking/ page).
const THINKING_LI_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21h-4V9Z"/></svg>';
const THINKING_PH_ICON = '<svg viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2v10h14V7H5Zm2 8 4-5 3 4 2-2 3 3H7Z"/><circle cx="8" cy="10" r="1.5"/></svg>';

function thinkingCardHTML(p, root) {
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  if (!p.link) {
    return `<div class="thinking-card is-placeholder"><div class="press-image ph">${THINKING_PH_ICON}</div>
      <span class="card-tag">${esc(p.tag)}</span><h4>${esc(p.title)}</h4></div>`;
  }
  const img = typeof p.image === 'string' ? { src: p.image } : p.image;
  const aria = 'aria-label="Open on LinkedIn" tabindex="-1" target="_blank" rel="noopener"';
  return `<div class="thinking-card">
    <a class="speaking-hit" href="${esc(p.link)}" ${aria}><img class="press-image" src="${esc(root + img.src)}" alt="" loading="lazy"${img.pos ? ` style="object-position:${esc(img.pos)}"` : ''}></a>
    <a class="speaking-hit" href="${esc(p.link)}" ${aria}><p class="thinking-excerpt">${esc(p.excerpt)}</p></a>
    <a class="li-btn" href="${esc(p.link)}" target="_blank" rel="noopener" aria-label="Read the full post on LinkedIn" title="Read the full post on LinkedIn">${THINKING_LI_ICON}</a>
  </div>`;
}
