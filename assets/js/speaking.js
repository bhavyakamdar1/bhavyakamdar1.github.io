// Speaking engagements. One object per event; sorted newest-first automatically.
//   date:      "YYYY-MM-DD" (first day of the event; used for sorting)
//   dateLabel: text shown beside the event, e.g. "5-7 Sep 2025"
//   type:      role, e.g. "Judge", "Panel", "Keynote", "Guest talk"
//   title, host (organiser)
//   posts:     LinkedIn posts about the event, in the order shown (keep excerpts to ~1 line):
//              { image (one) or images (several, optional), excerpt (opening lines), link }
//              or questions: [{ text, link }] instead of excerpt/link, to share several LinkedIn posts in one card
//              an image can be a path or { src, pos: "x% y%" } to choose which part shows when cropped
const SPEAKING_EVENTS = [
  {
    date: "2026-10-03",
    dateLabel: "3\u20134 Oct 2026",
    type: "Judge \u00b7 Finance Ka Funda",
    title: "THE EDGE 2026",
    host: "Rising Youth Network \u00b7 SKIPS University",
    posts: [
      {
        image: { src: "../assets/images/speaking/the-edge-2026.jpg", pos: "50% 0%" },
        excerpt: "Excited to share that I\u2019ve been invited to be a Judge for THE EDGE 2026, jointly organised by Rising Youth Network and SKIPS University\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_theedge2026-ryn-skipsuniversity-share-7510941806772146176-1dv9/",
      },
    ],
  },
  {
    date: "2026-07-31",
    dateLabel: "31 Jul \u2013 1 Aug 2026",
    type: "Judge \u00b7 Freshers\u2019 Idea Hunt",
    title: "ManaGenious Conclave 2026",
    host: "Faculty of Commerce, GLS University \u00b7 Innovision \u2013 The Management Club",
    posts: [
      {
        image: { src: "../assets/images/speaking/managenious-2026.jpg", pos: "50% 50%" },
        excerpt: "Excited and grateful to be invited as a Judge for the Freshers\u2019 Idea Hunt at ManaGenious Conclave 2026\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_managenious2026-glsuniversity-facultyofcommerce-share-7487752434484936705-obWu/",
      },
      {
        images: [
          { src: "../assets/images/speaking/managenious-2026-judges.jpg", pos: "50% 50%" },
          { src: "../assets/images/speaking/managenious-2026-group.jpg", pos: "50% 50%" },
        ],
        excerpt: "From Building the Product to Selling the Product. It was a pleasure to be invited as a Judge for the Fresher\u2019s Idea Hunt\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_managenious2026-fresherideahunt-glsuniversity-share-7502603288115113984-3OHW/",
      },
    ],
  },
  {
    date: "2026-03-29",
    dateLabel: "29 Mar 2026",
    type: "Panelist \u00b7 AI in Finance",
    title: "FinXplore 2026",
    host: "H. L. College of Commerce (Autonomous)",
    posts: [
      {
        image: { src: "../assets/images/speaking/finxplore-2026.jpg", pos: "50% 80%" },
        excerpt: "\u201cWill AI take away my Finance Job?\u201d A question driven by fear, curiosity, and a rapidly changing reality\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_aiinfinance-futureready-careers-share-7443526016519757824-t0xt/",
      },
      {
        images: [
          { src: "../assets/images/speaking/finxplore-2026-panel.jpg", pos: "50% 50%" },
          { src: "../assets/images/speaking/finxplore-2026-memento.jpg", pos: "62% 40%" },
          { src: "../assets/images/speaking/finxplore-2026-plaque.jpg", pos: "50% 45%" },
        ],
        excerpt: "If you think AI will replace you, you\u2019re asking the wrong question\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_ai-finance-finxplore2026-ugcPost-7444975186501586944-Aj8A/",
      },
      {
        image: { src: "../assets/images/speaking/finxplore-2026-speaking.jpg", pos: "52% 62%" },
        questions: [
          {
            text: "Will unequal access to AI tools widen the investing gap between retail and institutions?",
            link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_will-unequal-access-to-ai-tools-widen-the-ugcPost-7448291930267897857-w6dm/",
          },
          {
            text: "Should students consider entrepreneurship in the AI-finance space?",
            link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_should-students-consider-entrepreneurship-share-7451865488344739840-J0sR/",
          },
        ],
      },
    ],
  },
  {
    date: "2026-02-10",
    dateLabel: "10\u201311 Feb 2026",
    type: "Judge \u00b7 The Budget\u2019s Chanakya",
    title: "Capital Conclave",
    host: "Faculty of Commerce, GLS University",
    posts: [
      {
        image: { src: "../assets/images/speaking/capital-conclave-2026.jpg", pos: "50% 8%" },
        excerpt: "Grateful for the opportunity to serve as a Judge at The Budget\u2019s Chanakya\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_grateful-for-the-opportunity-to-serve-as-ugcPost-7427574143547691008-mqj9/",
      },
      {
        images: [
          { src: "../assets/images/speaking/capital-conclave-speaking.jpg", pos: "50% 34%" },
          { src: "../assets/images/speaking/capital-conclave-students.jpg", pos: "50% 62%" },
          { src: "../assets/images/speaking/capital-conclave-team.jpg", pos: "50% 62%" },
        ],
        excerpt: "Where Policy Met Young Perspectives: Inside The Budget\u2019s Chanakya organised by FOC, GLS\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_budgetschanakya-unionbudget2026-budgetanalysis-ugcPost-7432306813859024898-k1fD/",
      },
    ],
  },
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
        excerpt: "Thrilled to share that I have been invited by H. L. College of Commerce (Autonomous)\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_hlcollegeofcommerce-shikhar2026-mun-ugcPost-7422144519313403904-jFZj/",
      },
      {
        images: [
          { src: "../assets/images/speaking/shikhar-2026-memento.jpg", pos: "50% 20%" },
          { src: "../assets/images/speaking/shikhar-2026-trophy.jpg", pos: "50% 38%" },
          { src: "../assets/images/speaking/shikhar-2026-team.jpg", pos: "50% 40%" },
        ],
        excerpt: "It's a Wrap for Shikhar 2026 (HLCC MUN). Thank you to H. L. College of Commerce\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_hlcollegeofcommerce-shikhar2026-hlccmun-ugcPost-7425043826228137985-GXu2/",
      },
      {
        images: [
          { src: "../assets/images/speaking/shikhar-2026-delegates.jpg", pos: "50% 60%" },
          { src: "../assets/images/speaking/shikhar-2026-committee.jpg", pos: "55% 40%" },
          { src: "../assets/images/speaking/shikhar-2026-debate.jpg", pos: "50% 40%" },
        ],
        excerpt: "When Digital Payments Fail: Policy Thinking at SHIKHAR 2026\u2026",
        link: "https://www.linkedin.com/posts/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194_hlcollegeofcommerce-shikhar2026-hlccmun-ugcPost-7426871148832813056-Dxpt/",
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

const LI_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21h-4V9Z"/></svg>';

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
      ? `<div class="speaking-gallery${imgs.length === 2 ? ' two' : ''}">${imgs.map((i) => `<img src="${esc(i.src)}" alt="${alt}" loading="lazy"${i.pos ? ` style="object-position:${esc(i.pos)}"` : ''}>`).join('')}</div>`
      : imgs.length ? `<img class="speaking-img" src="${esc(imgs[0].src)}" alt="${alt}" loading="lazy"${imgs[0].pos ? ` style="object-position:${esc(imgs[0].pos)}"` : ''}>` : '';
    const mediaLink = p.link || (p.questions && p.questions[0] && p.questions[0].link);
    const aria = `aria-label="Open on LinkedIn" tabindex="-1" target="_blank" rel="noopener"`;
    return `<div class="speaking-post${p.questions ? ' has-questions' : ''}">
      ${media && mediaLink ? `<a class="speaking-hit" href="${esc(mediaLink)}" ${aria}>${media}</a>` : media}
      <div class="speaking-body">
        ${p.excerpt ? (p.link ? `<a class="speaking-hit" href="${esc(p.link)}" ${aria}><p class="speaking-excerpt">${esc(p.excerpt)}</p></a>` : `<p class="speaking-excerpt">${esc(p.excerpt)}</p>`) : ''}
        ${p.questions ? `<ul class="speaking-qs">${p.questions.map((q) => `<li><a class="speaking-hit" href="${esc(q.link)}" ${aria}><p class="speaking-q">${esc(q.text)}</p></a><a class="li-btn sm" href="${esc(q.link)}" target="_blank" rel="noopener" aria-label="Read on LinkedIn" title="Read on LinkedIn">${LI_ICON}</a></li>`).join('')}</ul>` : ''}
        ${p.link ? `<a class="li-btn" href="${esc(p.link)}" target="_blank" rel="noopener" aria-label="Read more on LinkedIn" title="Read more on LinkedIn">${LI_ICON}</a>` : ''}
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
