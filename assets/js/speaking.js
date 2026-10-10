// Speaking engagements. One object per event; sorted newest-first automatically.
//   date:      "YYYY-MM-DD" (first day of the event; used for sorting)
//   dateLabel: text shown beside the event, e.g. "5-7 Sep 2025"
//   type:      role, e.g. "Judge", "Panel", "Keynote", "Guest talk"
//   title, host (organiser)
//   posts:     LinkedIn posts about the event, shown in order:
//              { image (one) or images (several, optional), excerpt (opening lines), link }
const SPEAKING_EVENTS = [
  {
    date: "2025-09-05",
    dateLabel: "5–7 Sep 2025",
    type: "Judge · The Boardroom",
    title: "Explorer 2025 | GLS University",
    host: "Faculty of Commerce, GLS University & Ahmedabad Branch of WIRC-ICAI",
    posts: [
      {
        image: "../assets/images/speaking/explorer-2025.jpg",
        excerpt: "Life comes full circle. Years ago, I walked through the corridors of the Faculty of Commerce, GLS University as a student, filled with curiosity and dreams. Today, I return to the same place, not as a student, but as a Judge at Explorer 2025: National Level FinTech - Business Conclave…",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_life-comes-full-circle-years-ago-i-share-7369278045666357251-veA1/",
      },
      {
        images: [
          "../assets/images/speaking/explorer-2025-with-dean.jpg",
          "../assets/images/speaking/explorer-2025-on-site.jpg",
          "../assets/images/speaking/explorer-2025-plaque.jpg",
        ],
        excerpt: "Grateful and inspired. It has been a wonderful 3 day experience at Explorer 2025: A National Level FinTech Business Conclave, organized by Faculty of Commerce, GLS University and ICAI Ahmedabad Branch. Being amongst students who showcased such great enthusiasm, determination, and innovative thinking was truly refreshing…",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_grateful-and-inspired-it-has-been-a-ugcPost-7371059639016214529-mfZS/",
      },
    ],
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

  const post = (p, title) => {
    const imgs = p.images || (p.image ? [p.image] : []);
    const alt = `${esc(title)} \u2014 from the LinkedIn post`;
    const media = imgs.length > 1
      ? `<div class="speaking-gallery">${imgs.map((src) => `<img src="${esc(src)}" alt="${alt}" loading="lazy">`).join('')}</div>`
      : imgs.length ? `<img class="speaking-img" src="${esc(imgs[0])}" alt="${alt}" loading="lazy">` : '';
    return `<div class="speaking-post${imgs.length ? ' has-image' : ''}">
      ${media}
      <div class="speaking-body">
        ${p.excerpt ? `<p class="speaking-excerpt">${esc(p.excerpt)}</p>` : ''}
        ${p.link ? `<a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener">Read more on LinkedIn</a>` : ''}
      </div>
    </div>`;
  };

  list.innerHTML = [...SPEAKING_EVENTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => `<article class="speaking-row">
      <time class="speaking-date" datetime="${esc(e.date)}">${esc(e.dateLabel || fmt(e.date))}</time>
      <div>
        <span class="card-tag">${esc(e.type)}</span>
        <h3>${esc(e.title)}</h3>
        ${e.host ? `<p class="speaking-meta">${esc(e.host)}</p>` : ''}
        <div class="speaking-posts">${(e.posts || []).map((p) => post(p, e.title)).join('')}</div>
      </div>
    </article>`)
    .join('');
})();
