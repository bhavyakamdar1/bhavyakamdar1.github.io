// Thinking pieces. One object per piece; sorted newest-first automatically.
//   date:    "YYYY-MM-DD" (used for sorting; shown as month + year)
//   tag:     short theme, e.g. "On writing"
//   title
//   excerpt: opening lines (optional, keep to ~2 lines)
//   image:   path or { src, pos: "x% y%" } to choose which part shows when cropped (optional)
//   link:    LinkedIn post or article URL (optional; without it the row isn't clickable)
const THINKING_POSTS = [
  { date: "2026-10-01", tag: "On writing",    title: "What a balance sheet can’t hold" },
  { date: "2026-09-01", tag: "On creativity", title: "The discipline of noticing" },
  { date: "2026-08-01", tag: "On risk",       title: "Why I put a die in my name" },
];

(function () {
  const list = document.getElementById('thinking-list');
  if (!list) return;

  if (!THINKING_POSTS.length) {
    list.innerHTML = '<p class="thinking-empty">Pieces are being added. Meanwhile, read along on <a href="https://www.linkedin.com/in/ca-bhavya-kamdar" target="_blank" rel="noopener">LinkedIn</a>.</p>';
    return;
  }

  const fmt = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PLACEHOLDER = '<svg viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2v10h14V7H5Zm2 8 4-5 3 4 2-2 3 3H7Z"/><circle cx="8" cy="10" r="1.5"/></svg>';

  list.innerHTML = [...THINKING_POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => {
      const img = p.image ? (typeof p.image === 'string' ? { src: p.image } : p.image) : null;
      const media = img
        ? `<img class="press-image thinking-img" src="${esc(img.src)}" alt="${esc(p.title)}" loading="lazy"${img.pos ? ` style="object-position:${esc(img.pos)}"` : ''}>`
        : `<div class="press-image ph">${PLACEHOLDER}</div>`;
      const inner = `${media}
        <div class="press-copy">
          <span class="card-tag">${esc(p.tag)}</span>
          <h4>${esc(p.title)}</h4>
          <time class="thinking-date" datetime="${esc(p.date)}">${fmt(p.date)}</time>
          ${p.excerpt ? `<p class="thinking-excerpt">${esc(p.excerpt)}</p>` : ''}
        </div>`;
      return p.link
        ? `<a class="press-row" href="${esc(p.link)}" target="_blank" rel="noopener">${inner}</a>`
        : `<div class="press-row">${inner}</div>`;
    })
    .join('');
})();
