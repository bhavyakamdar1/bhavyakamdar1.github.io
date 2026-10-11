// Speaking engagements. One object per event; sorted newest-first automatically.
//   date:      "YYYY-MM-DD" (first day of the event; used for sorting)
//   dateLabel: text shown beside the event, e.g. "5-7 Sep 2025"
//   type:      role, e.g. "Judge", "Panel", "Keynote", "Guest talk"
//   title, host (organiser)
//   posts:     LinkedIn posts about the event, in the order shown (keep excerpts to ~1 line):
//              { image (one) or images (several, optional), excerpt (opening lines), link }
//              an image can be a path or { src, pos: "x% y%" } to choose which part shows when cropped
const SPEAKING_EVENTS = [
  {
    date: "2026-02-01",
    dateLabel: "1 Feb 2026",
    type: "RBI Governor \u00b7 Index Business Committee",
    title: "SHIKHAR 2026 | HLCC MUN",
    host: "H. L. College of Commerce (Autonomous)",
    posts: [
      {
        images: [
          { src: "../assets/images/speaking/shikhar-2026-rbi.jpg", pos: "50% 62%" },
          { src: "../assets/images/speaking/shikhar-2026-index-business.jpg", pos: "50% 52%" },
          { src: "../assets/images/speaking/shikhar-2026-logo.jpg", pos: "50% 50%" },
        ],
        excerpt: "Thrilled to share that I have been invited by H. L. College of Commerce (Autonomous) to be part of the Executive Board for SHIKHAR 2026 (Crafted by HLCC MUN)\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_hlcollegeofcommerce-shikhar2026-mun-ugcPost-7422144519313403904-jFZj/",
      },
      {
        images: [
          { src: "../assets/images/speaking/shikhar-2026-memento.jpg", pos: "50% 20%" },
          { src: "../assets/images/speaking/shikhar-2026-trophy.jpg", pos: "50% 38%" },
          { src: "../assets/images/speaking/shikhar-2026-team.jpg", pos: "50% 40%" },
        ],
        excerpt: "It's a Wrap for Shikhar 2026 (HLCC MUN). Thank you to H. L. College of Commerce (Autonomous) for organising SHIKHAR 2026 with such professionalism and vision\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_hlcollegeofcommerce-shikhar2026-hlccmun-ugcPost-7425043826228137985-GXu2/",
      },
    ],
  },
  {
    date: "2025-11-04",
    dateLabel: "4 Nov 2025",
    type: "Co-ordinator \u00b7 Conference",
    title: "AI in Practice: Transforming CA Offices through Smart Automation",
    host: "ICAI Ahmedabad Branch",
    posts: [
      {
        images: [
          "../assets/images/speaking/ai-in-practice-podium.jpg",
          { src: "../assets/images/speaking/ai-in-practice-panel.jpg", pos: "88% 30%" },
          { src: "../assets/images/speaking/ai-in-practice-stage.jpg", pos: "88% 50%" },
        ],
        excerpt: "An insightful conference on \u201cAI in Practice: Transforming CA Offices through Smart Automation\u201d was held at ICAI Ahmedabad Branch\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_icai-ahmedabadbranch-artificialintelligence-ugcPost-7392503511592345600-T4Vx/",
      },
    ],
  },
  {
    date: "2025-11-01",
    dateLabel: "1 Nov 2025",
    type: "Guest Speaker \u00b7 Professional Skills for Administration",
    title: "Non-Teaching Staff Training Programme",
    host: "Banaskantha District Kelavani Mandal & G.D. Modi Vidya Sankul",
    posts: [
      {
        images: [
          "../assets/images/speaking/kelavani-mandal-session.jpg",
          "../assets/images/speaking/kelavani-mandal-plaque.jpg",
          "../assets/images/speaking/kelavani-mandal-hall.jpg",
        ],
        excerpt: "It was an honour to be invited as a Guest Speaker at G.D. Modi Vidya Sankul, as part of the Non-Teaching Staff Training Programme\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_it-was-an-honour-to-be-invited-as-a-guest-ugcPost-7391146336634601472-p7TV/",
      },
    ],
  },
  {
    date: "2025-09-05",
    dateLabel: "5–7 Sep 2025",
    type: "Judge · The Boardroom",
    title: "Explorer 2025",
    host: "Faculty of Commerce, GLS University & Ahmedabad Branch of WIRC-ICAI",
    posts: [
      {
        image: "../assets/images/speaking/explorer-2025.jpg",
        excerpt: "Life comes full circle. Years ago, I walked through the corridors of the Faculty of Commerce, GLS University as a student\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_life-comes-full-circle-years-ago-i-share-7369278045666357251-veA1/",
      },
      {
        images: [
          "../assets/images/speaking/explorer-2025-with-dean.jpg",
          "../assets/images/speaking/explorer-2025-on-site.jpg",
          "../assets/images/speaking/explorer-2025-plaque.jpg",
        ],
        excerpt: "Grateful and inspired. It has been a wonderful 3 day experience at Explorer 2025: A National Level FinTech Business Conclave\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_grateful-and-inspired-it-has-been-a-ugcPost-7371059639016214529-mfZS/",
      },
      {
        images: [
          "../assets/images/speaking/explorer-2025-boardroom-hall.jpg",
          "../assets/images/speaking/explorer-2025-boardroom-judges.jpg",
          "../assets/images/speaking/explorer-2025-boardroom-round.jpg",
        ],
        excerpt: "The curtains have closed on Explorer 2025: A National Level FinTech Business Conclave, and this is how THE BOARDROOM event went over the 3 Days\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_the-curtains-have-closed-on-explorer-2025-ugcPost-7373946116045889536-Yc9f/",
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
    const imgs = (p.images || (p.image ? [p.image] : [])).map((i) => (typeof i === 'string' ? { src: i } : i));
    const alt = `${esc(title)} \u2014 from the LinkedIn post`;
    const media = imgs.length > 1
      ? `<div class="speaking-gallery">${imgs.map((i) => `<img src="${esc(i.src)}" alt="${alt}" loading="lazy"${i.pos ? ` style="object-position:${esc(i.pos)}"` : ''}>`).join('')}</div>`
      : imgs.length ? `<img class="speaking-img" src="${esc(imgs[0].src)}" alt="${alt}" loading="lazy">` : '';
    return `<div class="speaking-post">
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
