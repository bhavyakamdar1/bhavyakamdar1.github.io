#!/usr/bin/env node
/* SEO + AEO generator for bhavyakamdar.com. No dependencies. Run from anywhere:

     node tools/seo.js

   Re-run it after adding a speaking event, a Thinking post, a book, or changing a price or an FAQ answer.
   It is safe to run repeatedly. It:
     1. writes the <head> block of every page (title, description, canonical, Open Graph, JSON-LD)
        between the SEO:START / SEO:END markers;
     2. pre-renders the Speaking and Thinking lists into their pages, so crawlers and AI assistants
        that do not run JavaScript still see the content (the page scripts render the same markup);
     3. writes the FAQ on /about/ from the FAQ list below (visible HTML + FAQPage JSON-LD);
     4. writes sitemap.xml.
   Book structured data is read from each book page (title, description, prices, specs), so the page stays the source of truth. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://bhavyakamdar.com';
const NAME = 'Bhavya Kamdar';
const EMAIL = 'cabhavyakamdar@gmail.com';
// Pre-filled mail link used for the address inside the About page FAQ (HTML-escaped for the href)
const EMAIL_LINK = 'mailto:cabhavyakamdar@gmail.com?subject=Hello%20Bhavya&amp;body=Hi%20Bhavya%2C%0D%0A%0D%0AI%20read%20your%20About%20page%20and%20wanted%20to%20reach%20out.%0D%0A%0D%0A%5BWrite%20your%20message%20here%5D%0D%0A%0D%0ARegards%2C%0D%0A%5BYour%20name%5D';
const LINKEDIN = 'https://www.linkedin.com/in/ca-bhavya-kamdar-%F0%9F%8E%B2-687723194';
const INSTAGRAM = 'https://www.instagram.com/bhavyakamdar1/';
const PERSON_ID = SITE + '/#person';
const WEBSITE_ID = SITE + '/#website';
// Site-ownership codes for Google Search Console / Bing Webmaster Tools (public by design; shown on the home page only).
const VERIFICATION = { 'google-site-verification': 'J-1pKCMyDVkQ5dMprZc5qV87QKJN9I7a0uvZszCaeX4' };
const DEFAULT_IMAGE = { src: '/assets/images/hero-speaking.jpg', w: 1500, h: 1000, alt: 'Bhavya Kamdar speaking on a panel' };

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ENTITIES = { amp: '&', middot: '·', times: '×', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', larr: '←', rarr: '→', quot: '"', nbsp: ' ' };
const text = (html) => String(html).replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-z]+);/g, (m, n) => ENTITIES[n] || m).replace(/\s+/g, ' ').trim();

/* ---------- Shared structured data ---------- */
const person = (full) => Object.assign({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: NAME,
  url: SITE + '/',
}, full ? {
  alternateName: 'CA Bhavya Kamdar',
  honorificPrefix: 'CA',
  jobTitle: 'Chartered Accountant',
  description: 'Bhavya Kamdar is a Chartered Accountant who believes every number has a story behind it. A GLS University alumnus, Bhavya wrote a first book at 16, speaks at institutions including ICAI, H. L. College of Commerce and SKIPS University, and writes Beyond Bhavya on LinkedIn. Latest book: Face Your Hope.',
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'GLS University' },
  image: SITE + '/assets/images/bhavya-portrait.webp',
  email: 'mailto:' + EMAIL,
  sameAs: [LINKEDIN, INSTAGRAM],
  hasOccupation: [
    { '@type': 'Occupation', name: 'Chartered Accountant' },
    { '@type': 'Occupation', name: 'Author' },
    { '@type': 'Occupation', name: 'Public speaker' },
  ],
  hasCredential: { '@type': 'EducationalOccupationalCredential', name: 'Chartered Accountant (CA)', credentialCategory: 'Professional certification' },
  knowsAbout: ['Chartered accountancy', 'Finance', 'Risk', 'Artificial intelligence in finance', 'Public policy', 'Business strategy', 'Financial statement analysis'],
} : {});

const website = () => ({ '@type': 'WebSite', '@id': WEBSITE_ID, url: SITE + '/', name: NAME, inLanguage: 'en', publisher: { '@id': PERSON_ID } });

const breadcrumb = (trail) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })),
});

const webpage = (p, type, extra) => Object.assign({
  '@type': type || 'WebPage',
  '@id': SITE + p.url + '#webpage',
  url: SITE + p.url,
  name: p.title,
  description: p.description,
  inLanguage: 'en',
  isPartOf: { '@id': WEBSITE_ID },
  about: { '@id': PERSON_ID },
}, extra || {});

/* ---------- Books: read the facts from each book page ---------- */
const BOOKS = ['face-your-hope', '11-weeks-for-better-you', 'the-31st-february-story', 'open-book-with-many-secrets', 'the-mysterious-castle'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const isoDate = (s) => {
  const m = /(\d{1,2}) (\w+) (\d{4})/.exec(s || '');
  if (!m) return undefined;
  return `${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};
const FORMATS = [[/hardcover/i, 'https://schema.org/Hardcover'], [/paperback/i, 'https://schema.org/Paperback'], [/ebook|kindle/i, 'https://schema.org/EBook']];

function bookFacts(slug) {
  const html = read(`books/${slug}/index.html`);
  const url = `/books/${slug}/`;
  const specs = {};
  for (const m of html.matchAll(/<dt>(.*?)<\/dt><dd>(.*?)<\/dd>/g)) specs[text(m[1])] = text(m[2]);
  const editions = [];
  for (const b of html.matchAll(/<div class="format-block">([\s\S]*?)<\/div>\s*<\/div>/g)) {
    const h = /<h4>(.*?)<\/h4>/.exec(b[1]);
    if (!h) continue;
    const label = text(h[1]);
    const price = (/₹\s*([\d,.]+)/.exec(label) || [])[1];
    const format = (FORMATS.find(([re]) => re.test(label)) || [])[1];
    const links = [...b[1].matchAll(/<a class="btn" href="([^"]+)"[^>]*>(.*?)<\/a>/g)].map((a) => ({ url: a[1].replace(/&amp;/g, '&'), seller: text(a[2]) }));
    editions.push({ label, price: price && price.replace(/,/g, ''), format, links });
  }
  const cover = (/<div class="book-cover-art">\s*<img src="[./]*([^"]+)"/.exec(html) || [])[1];
  return {
    slug, url,
    name: text((/<h1>(.*?)<\/h1>/.exec(html) || [])[1]),
    genre: text((/<span class="card-tag">(.*?)<\/span>/.exec(html) || [])[1]).split('·').map((g) => g.trim()),
    description: [...html.matchAll(/<p class="book-desc">([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).join(' '),
    image: '/' + cover,
    specs, editions,
    published: isoDate(specs.Published),
  };
}

function bookSchema(b) {
  const isbn = (b.specs['ISBN-13'] || '').replace(/-/g, '') || undefined;
  return {
    '@type': 'Book',
    '@id': SITE + b.url + '#book',
    name: b.name,
    url: SITE + b.url,
    author: { '@id': PERSON_ID },
    description: b.description,
    image: SITE + b.image,
    genre: b.genre,
    inLanguage: 'en',
    numberOfPages: b.specs.Pages ? +b.specs.Pages : undefined,
    datePublished: b.published,
    publisher: b.specs.Publisher ? { '@type': 'Organization', name: b.specs.Publisher } : undefined,
    isbn,
    workExample: b.editions.filter((e) => e.format).map((e) => ({
      '@type': 'Book',
      name: `${b.name} (${e.label.split('·')[0].trim()})`,
      bookFormat: e.format,
      inLanguage: 'en',
      offers: e.links.map((l) => ({
        '@type': 'Offer', url: l.url, price: e.price, priceCurrency: 'INR',
        availability: 'https://schema.org/InStock', seller: { '@type': 'Organization', name: l.seller },
      })),
    })),
  };
}

/* ---------- Speaking + Thinking: run the page scripts to get the same markup ---------- */
function speakingData() {
  const el = { innerHTML: '' };
  const ctx = vm.createContext({ document: { getElementById: (id) => (id === 'speaking-list' ? el : null) } });
  vm.runInContext(read('assets/js/speaking.js') + '\n;globalThis.__events = SPEAKING_EVENTS;', ctx);
  return { html: el.innerHTML, events: [...ctx.__events].sort((a, b) => b.date.localeCompare(a.date)) };
}
function thinkingData() {
  const ctx = vm.createContext({});
  vm.runInContext(read('assets/js/thinking-posts.js') + '\n' + read('assets/js/thinking-render.js') +
    "\n;globalThis.__posts = THINKING_POSTS; globalThis.__html = THINKING_POSTS.map((p) => thinkingCardHTML(p, '../')).join('');", ctx);
  return { html: ctx.__html, posts: ctx.__posts };
}

/* ---------- FAQ (shown on /about/ and published as FAQPage structured data) ---------- */
// Answers are HTML; keep them factual and self-contained, because answer engines quote them out of context.
function faq(books, events) {
  const fyh = books[0];
  const year = (b) => (b.published || '').slice(0, 4);
  const price = (b, re) => (b.editions.find((e) => re.test(e.label)) || {}).price;
  const bookList = books.map((b) => `<a href="..${b.url}"><em>${esc(b.name)}</em></a> (${year(b)})`);
  const hosts = ['ICAI Ahmedabad Branch', 'GLS University', 'H. L. College of Commerce', 'SKIPS University', 'Rising Youth Network'];
  return [
    ['Who is Bhavya Kamdar?',
      `Bhavya Kamdar is a Chartered Accountant who believes every number has a story behind it. Bhavya is an author, a speaker invited by institutions such as ICAI, H. L. College of Commerce and SKIPS University, and the writer of <em>Beyond Bhavya</em> on LinkedIn. The latest book is <em>Face Your Hope</em> (${year(fyh)}).`],
    ['Where did Bhavya Kamdar study, and when did Bhavya start writing?',
      `Bhavya Kamdar is an alumnus of GLS University and qualified as a Chartered Accountant. Bhavya wrote a first book at the age of 16 and has gone on to write ${books.length} books in total.`],
    ['What books has Bhavya Kamdar written?',
      `Bhavya Kamdar has written ${books.length} books: ${bookList.slice(0, -1).join(', ')} and ${bookList.slice(-1)}.`],
    ['What is Face Your Hope about?',
      `<em>Face Your Hope</em> is a collection of stories from a real life, told the way memory tells them. Each story carries a different kind of hope and stands on its own, so the book can be opened at any page, in any order. Its central idea is that to hope is to risk: hope moves with risk, choice and luck, and the more you act, the more places luck has to find you. It is ${fyh.specs.Pages} pages, published by ${fyh.specs.Publisher} on ${fyh.specs.Published}.`],
    ['Where can I buy Face Your Hope?',
      `<em>Face Your Hope</em> is sold on Amazon.in, Flipkart and Notion Press as a hardcover (&#8377;${price(fyh, /hardcover/i)}) and a paperback (&#8377;${price(fyh, /paperback/i)}), and as a Kindle eBook on Amazon.in (&#8377;${price(fyh, /ebook|kindle/i)}). All the buying links are on the <a href="..${fyh.url}#buy">Face Your Hope page</a>.`],
    ['Is there a Face Your Hope audiobook?',
      `Not yet. An audiobook of <em>Face Your Hope</em>, with every chapter read aloud, is planned for early 2027.`],
    ['What is the Face Your Hope game?',
      `&ldquo;The Ship Is Sinking&rdquo; is the free companion game to <em>Face Your Hope</em>. You try to save a ship in a thunderstorm over four rounds, and it lets you feel what hope asks of you before you read a page. It runs in any web browser at <a href="../face-your-hope/game">bhavyakamdar.com/face-your-hope/game</a>.`],
    ['What does Bhavya Kamdar speak about?',
      `Bhavya Kamdar speaks with students and professionals about finance, AI in finance and in CA practice, public policy and the Union Budget, and the choices that shape a career. Engagements include guest sessions, panels and judging at ${hosts.slice(0, -1).join(', ')} and ${hosts.slice(-1)}. The <a href="../speaking/">speaking page</a> lists all ${events.length} engagements.`],
    ['What is Beyond Bhavya?',
      `Beyond Bhavya is Bhavya Kamdar&rsquo;s series of short business and finance explainers: why companies win, why policies shift, and what a balance sheet doesn&rsquo;t say. The posts are published on <a href="${LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a>, where more than 6,000 people follow Bhavya. Posts have covered Apple, Berkshire Hathaway&rsquo;s investment in Japan, the yen carry trade, the Korea Discount, India Stack and quick commerce in India. They are collected on the <a href="../thinking/">Thinking page</a>.`],
    ['How can I invite Bhavya Kamdar to speak, or get in touch?',
      `Email <a href="${EMAIL_LINK}">${EMAIL}</a> about a talk, a panel, judging an event, a book, or just to say hello. Bhavya is also on <a href="${LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a> and <a href="${INSTAGRAM}" target="_blank" rel="noopener">Instagram</a>.`],
  ];
}

/* ---------- Pages ---------- */
const books = BOOKS.map(bookFacts);
const speaking = speakingData();
const thinking = thinkingData();
const FAQ = faq(books, speaking.events);
const bookDesc = {
  'face-your-hope': 'Face Your Hope by CA Bhavya Kamdar — a collection of stories from a real life, told the way memory tells them. Buy the hardcover or paperback, and play the companion game.',
  '11-weeks-for-better-you': '11 Weeks for Better You by Bhavya Kamdar — a daily companion guide to build a learning habit across Personal Growth, Health, Relationships, Finance, and Marketing & Selling. Buy the paperback or Kindle edition.',
  'the-31st-february-story': 'The 31st February Story by Bhavya Kamdar — a meteoroid stops Earth’s rotation, and two extra days appear on the calendar. A sci-fi thriller about what you do with time you were never promised.',
  'open-book-with-many-secrets': 'Open Book With Many Secrets by Bhavya Kamdar — Anthony Oliver’s life changes when he meets the most beautiful girl in his dreams. A mystery-fantasy novella. Buy the paperback or Kindle edition.',
  'the-mysterious-castle': 'The Mysterious Castle by Bhavya Kamdar — Jack, Millie and Max set out to discover a lost castle hidden on earth. An adventure-mystery story. Buy the paperback or Kindle edition.',
};
const bookTitle = (b) => `${b.name} by Bhavya Kamdar — ${b.genre.join(', ')} Book`;

const PAGES = [
  {
    file: 'index.html', url: '/', sitemap: 1.0,
    title: 'Bhavya Kamdar — Chartered Accountant, Author & Speaker',
    description: 'Bhavya Kamdar is a Chartered Accountant who believes every number has a story behind it. Author of Face Your Hope, speaker, and writer of Beyond Bhavya on LinkedIn.',
    graph: (p) => [website(), person(true), webpage(p, 'WebPage', { mainEntity: { '@id': PERSON_ID }, primaryImageOfPage: SITE + DEFAULT_IMAGE.src })],
  },
  {
    file: 'about/index.html', url: '/about/', sitemap: 0.9, ogType: 'profile',
    image: { src: '/assets/images/bhavya-portrait.webp', w: 780, h: 1040, alt: 'CA Bhavya Kamdar' }, card: 'summary',
    title: 'About Bhavya Kamdar — Chartered Accountant, Author & Speaker',
    description: 'Who is Bhavya Kamdar? A Chartered Accountant, speaker and author of five books including Face Your Hope. Quick facts, books, speaking and answers to common questions.',
    graph: (p) => [website(), person(true),
      webpage(p, 'ProfilePage', { mainEntity: { '@id': PERSON_ID } }),
      { '@type': 'FAQPage', '@id': SITE + p.url + '#faq', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: text(a) } })) },
      breadcrumb([['Home', '/'], ['About', '/about/']])],
  },
  {
    file: 'books/index.html', url: '/books/', sitemap: 0.9,
    image: { src: books[0].image, w: 800, h: 1200, alt: 'Face Your Hope — book cover' }, card: 'summary',
    title: 'Books by Bhavya Kamdar — Face Your Hope and More',
    description: 'All five books by Bhavya Kamdar: Face Your Hope, 11 Weeks for Better You, The 31st February Story, Open Book With Many Secrets and The Mysterious Castle.',
    graph: (p) => [website(), person(),
      webpage(p, 'CollectionPage', { mainEntity: { '@type': 'ItemList', itemListElement: books.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, url: SITE + b.url })) } }),
      breadcrumb([['Home', '/'], ['Books', '/books/']])],
  },
  ...books.map((b) => ({
    file: `books/${b.slug}/index.html`, url: b.url, sitemap: b.slug === 'face-your-hope' ? 0.9 : 0.7, ogType: 'book',
    image: { src: b.image, w: 800, h: 1200, alt: `${b.name} — book cover` }, card: 'summary',
    title: bookTitle(b),
    description: bookDesc[b.slug],
    graph: (p) => [website(), person(), webpage(p, 'WebPage', { mainEntity: { '@id': SITE + b.url + '#book' }, about: undefined }), bookSchema(b),
      breadcrumb([['Home', '/'], ['Books', '/books/'], [b.name, b.url]])],
  })),
  {
    file: 'speaking/index.html', url: '/speaking/', sitemap: 0.8,
    image: { src: '/assets/images/speaking-hero.jpg', w: 1400, h: 933, alt: 'Bhavya Kamdar speaking to a classroom of students' },
    title: 'Speaking — Talks, Panels & Judging by Bhavya Kamdar',
    description: 'Talks, panels and judging engagements by CA Bhavya Kamdar on finance, AI and policy — at ICAI, GLS University, H. L. College of Commerce and SKIPS University.',
    graph: (p) => [website(), person(),
      webpage(p, 'CollectionPage', { mainEntity: { '@type': 'ItemList', itemListElement: speaking.events.map((e, i) => ({
        '@type': 'ListItem', position: i + 1,
        item: { '@type': 'Event', name: e.title, startDate: e.date, description: `${e.type} — ${e.host}`, organizer: { '@type': 'Organization', name: e.host }, performer: { '@id': PERSON_ID }, eventStatus: 'https://schema.org/EventScheduled' },
      })) } }),
      breadcrumb([['Home', '/'], ['Speaking', '/speaking/']])],
  },
  {
    file: 'thinking/index.html', url: '/thinking/', sitemap: 0.8,
    title: 'Beyond Bhavya — Business & Finance Explainers by Bhavya Kamdar',
    description: 'Beyond Bhavya: why companies win, why policies shift, and what a balance sheet doesn’t say. Business and finance explainers by CA Bhavya Kamdar.',
    graph: (p) => [website(), person(),
      webpage(p, 'CollectionPage', { mainEntity: { '@type': 'ItemList', itemListElement: thinking.posts.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.excerpt, url: t.link })) } }),
      breadcrumb([['Home', '/'], ['Thinking', '/thinking/']])],
  },
  {
    file: 'face-your-hope/game.html', url: '/face-your-hope/game', sitemap: 0.7,
    image: { src: books[0].image, w: 800, h: 1200, alt: 'Face Your Hope — book cover' }, card: 'summary',
    title: 'Face Your Hope: The Game — Can You Save the Ship?',
    description: 'Play “The Ship Is Sinking”, the free companion game to Face Your Hope by Bhavya Kamdar. A thunderstorm is coming — save the ship across four rounds, right in your browser.',
    graph: (p) => [website(), person(), webpage(p),
      { '@type': 'VideoGame', '@id': SITE + p.url + '#game', name: 'Face Your Hope: The Game (The Ship Is Sinking)', url: SITE + p.url, description: p.description,
        gamePlatform: 'Web browser', applicationCategory: 'Game', operatingSystem: 'Any', inLanguage: 'en', author: { '@id': PERSON_ID },
        isBasedOn: { '@id': SITE + books[0].url + '#book' }, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
      breadcrumb([['Home', '/'], ['Face Your Hope', books[0].url], ['The Game', p.url]])],
  },
  {
    file: 'face-your-hope/audiobook.html', url: '/face-your-hope/audiobook',
    image: { src: books[0].image, w: 800, h: 1200, alt: 'Face Your Hope — book cover' }, card: 'summary',
    title: 'Face Your Hope — Listen to the Audiobook or Play the Game',
    description: 'Face Your Hope by Bhavya Kamdar: listen to the audiobook or play the companion game.',
  },
  {
    file: 'face-your-hope/listen.html', url: '/face-your-hope/listen',
    image: { src: books[0].image, w: 800, h: 1200, alt: 'Face Your Hope — book cover' }, card: 'summary',
    title: 'Face Your Hope Audiobook — Coming Early 2027',
    description: 'Face Your Hope by Bhavya Kamdar, read aloud. The audiobook is coming in early 2027.',
  },
];

/* ---------- <head> block ---------- */
function headBlock(p) {
  const img = p.image || DEFAULT_IMAGE;
  const depth = p.file.split('/').length - 1;
  const rel = '../'.repeat(depth);
  const clean = (o) => JSON.parse(JSON.stringify(o));
  const lines = [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}">`,
    `<meta name="author" content="${NAME}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`,
    `<link rel="canonical" href="${SITE}${p.url}">`,
    `<link rel="icon" href="${rel}assets/images/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="${rel}assets/images/favicon-48.png" type="image/png" sizes="48x48">`,
    `<link rel="apple-touch-icon" href="${rel}assets/images/apple-touch-icon.png">`,
    `<meta property="og:site_name" content="${NAME}">`,
    `<meta property="og:type" content="${p.ogType || 'website'}">`,
    `<meta property="og:title" content="${esc(p.title)}">`,
    `<meta property="og:description" content="${esc(p.description)}">`,
    `<meta property="og:url" content="${SITE}${p.url}">`,
    `<meta property="og:image" content="${SITE}${img.src}">`,
    `<meta property="og:image:width" content="${img.w}">`,
    `<meta property="og:image:height" content="${img.h}">`,
    `<meta property="og:image:alt" content="${esc(img.alt)}">`,
    `<meta property="og:locale" content="en_IN">`,
    `<meta name="twitter:card" content="${p.card || 'summary_large_image'}">`,
    `<meta name="twitter:title" content="${esc(p.title)}">`,
    `<meta name="twitter:description" content="${esc(p.description)}">`,
    `<meta name="twitter:image" content="${SITE}${img.src}">`,
  ];
  if (p.url === '/') for (const [name, content] of Object.entries(VERIFICATION)) lines.push(`<meta name="${name}" content="${esc(content)}">`);
  if (p.graph) {
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': clean(p.graph(p)) }).replace(/</g, '\\u003c');
    lines.push(`<script type="application/ld+json">${json}</script>`);
  }
  return `<!-- SEO:START generated by tools/seo.js, do not edit by hand -->\n${lines.join('\n')}\n<!-- SEO:END -->`;
}

function applyHead(html, p) {
  html = html.replace(/<!-- SEO:START[\s\S]*?<!-- SEO:END -->\n?/, '')
    .replace(/<title>[\s\S]*?<\/title>\n?/, '')
    .replace(/<meta name="description"[^>]*>\n?/, '')
    .replace(/<link rel="canonical"[^>]*>\n?/, '');
  const anchor = /<meta name="viewport"[^>]*>\n/;
  if (!anchor.test(html)) throw new Error(`${p.file}: no viewport meta to anchor the SEO block`);
  return html.replace(anchor, (m) => m + headBlock(p) + '\n');
}

function fill(html, id, inner, file) {
  const marked = new RegExp(`(id="${id}">)<!-- PRERENDER:START -->[\\s\\S]*?<!-- PRERENDER:END -->`);
  const empty = new RegExp(`(id="${id}">)(?=</div>)`);
  const re = marked.test(html) ? marked : empty;
  if (!re.test(html)) throw new Error(`${file}: container #${id} not found or not empty`);
  return html.replace(re, (_, open) => `${open}<!-- PRERENDER:START -->${inner}<!-- PRERENDER:END -->`);
}

const faqHTML = FAQ.map(([q, a]) => `\n    <details class="faq-item">\n      <summary><h3>${q}</h3></summary>\n      <p>${a}</p>\n    </details>`).join('') + '\n  ';

for (const p of PAGES) {
  let html = applyHead(read(p.file), p);
  if (p.file === 'speaking/index.html') html = fill(html, 'speaking-list', speaking.html, p.file);
  if (p.file === 'thinking/index.html') html = fill(html, 'thinking-posts', thinking.html, p.file);
  if (p.file === 'about/index.html') html = fill(html, 'faq-list', faqHTML, p.file);
  write(p.file, html);
}

/* ---------- sitemap.xml ---------- */
const today = new Date().toISOString().slice(0, 10);
const lastmod = (file) => {
  try {
    if (execSync(`git status --porcelain -- "${file}"`, { cwd: ROOT }).toString().trim()) return today;
    return execSync(`git log -1 --format=%cs -- "${file}"`, { cwd: ROOT }).toString().trim() || today;
  } catch (e) { return today; }
};
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.filter((p) => p.sitemap).map((p) => `  <url><loc>${SITE}${p.url}</loc><lastmod>${lastmod(p.file)}</lastmod></url>`).join('\n')}
</urlset>
`);

console.log(`SEO: ${PAGES.length} pages, ${speaking.events.length} speaking events, ${thinking.posts.length} thinking posts, ${FAQ.length} FAQs, ${books.length} books.`);
