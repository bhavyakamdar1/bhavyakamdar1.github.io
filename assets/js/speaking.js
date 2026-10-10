// Speaking engagements. Add one object per event; the list is sorted
// newest-first automatically, so order here doesn't matter.
//   date:    "YYYY-MM-DD" (use the first of the month if only month is known)
//   type:    role, e.g. "Judge", "Panel", "Keynote", "Guest talk"
//   title, host (organiser), location
//   excerpt: opening lines of the LinkedIn post
//   image:   path under assets/images/speaking/ (optional)
//   link:    LinkedIn post URL -> "Read more on LinkedIn"
const SPEAKING_EVENTS = [
  {
    date: "2025-09-04",
    type: "Judge · The Boardroom",
    title: "Explorer 2025 | GLS University",
    host: "Faculty of Commerce, GLS University & Ahmedabad Branch of WIRC-ICAI",
    location: "Ahmedabad",
    excerpt: "Life comes full circle. Years ago, I walked through the corridors of the Faculty of Commerce, GLS University as a student, filled with curiosity and dreams. Today, I return to the same place, not as a student, but as a Judge at Explorer 2025: National Level FinTech - Business Conclave…",
    image: "../assets/images/speaking/explorer-2025.jpg",
    link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_life-comes-full-circle-years-ago-i-share-7369278045666357251-veA1/",
  },
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
      return `<article class="speaking-row">
        <time class="speaking-date" datetime="${esc(e.date)}">${fmt(e.date)}</time>
        <div class="speaking-card${e.image ? ' has-image' : ''}">
          ${e.image ? `<img class="speaking-img" src="${esc(e.image)}" alt="${esc(e.title)} — event poster" loading="lazy">` : ''}
          <div class="speaking-body">
            <span class="card-tag">${esc(e.type)}</span>
            <h3>${esc(e.title)}</h3>
            ${meta ? `<p class="speaking-meta">${meta}</p>` : ''}
            ${e.excerpt ? `<p class="speaking-excerpt">${esc(e.excerpt)}</p>` : ''}
            ${e.link ? `<a class="btn" href="${esc(e.link)}" target="_blank" rel="noopener">Read more on LinkedIn</a>` : ''}
          </div>
        </div>
      </article>`;
    })
    .join('');
})();
