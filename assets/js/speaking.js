// Speaking engagements. Add one object per event; the list is sorted
// newest-first automatically, so order here doesn't matter.
//   date:  "YYYY-MM-DD" (use the first day of the month if only month is known)
//   type:  e.g. "Guest talk", "Panel", "Judge", "Keynote", "Workshop"
//   title, host (organiser), location, description (optional), link (optional)
const SPEAKING_EVENTS = [
  // { date: "2025-03-14", type: "Panel", title: "Event title", host: "Organiser", location: "City", description: "", link: "" },
];

(function () {
  const list = document.getElementById('speaking-list');
  if (!list) return;

  if (!SPEAKING_EVENTS.length) {
    list.innerHTML = '<p class="speaking-empty">Engagements are being added. Meanwhile, see recent talks on <a href="https://www.linkedin.com/in/ca-bhavya-kamdar" target="_blank" rel="noopener">LinkedIn</a>.</p>';
    return;
  }

  const fmt = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  list.innerHTML = [...SPEAKING_EVENTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => {
      const meta = [e.host, e.location].filter(Boolean).map(esc).join(' &middot; ');
      const title = e.link
        ? `<a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.title)}</a>`
        : esc(e.title);
      return `<article class="speaking-row">
        <time class="speaking-date" datetime="${esc(e.date)}">${fmt(e.date)}</time>
        <div>
          <span class="card-tag">${esc(e.type)}</span>
          <h3>${title}</h3>
          ${meta ? `<p class="speaking-meta">${meta}</p>` : ''}
          ${e.description ? `<p>${esc(e.description)}</p>` : ''}
        </div>
      </article>`;
    })
    .join('');
})();
