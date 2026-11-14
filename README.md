# bhavyakamdar1.github.io

Source of [bhavyakamdar.com](https://bhavyakamdar.com): a static site served by GitHub Pages, no build step.

## SEO / AEO

`tools/seo.js` (Node, no dependencies) keeps the search and answer-engine layer in sync with the content:

```bash
node tools/seo.js
```

Run it, then commit, after you:

- add a speaking event (`assets/js/speaking.js`) or a Thinking post (`assets/js/thinking-posts.js`): it pre-renders both lists into their pages so crawlers that don't run JavaScript can read them;
- change a book page (price, description, specs): the Book structured data is read from the page;
- change a page title, description or an FAQ answer: these live in `tools/seo.js`;
- add a page: add it to `PAGES` in `tools/seo.js` (and to `llms.txt`).

It writes the `SEO:START … SEO:END` block in every page's `<head>`, the FAQ on `/about/`, and `sitemap.xml`. Don't edit those by hand.

`robots.txt` and `llms.txt` (a plain-text summary of the site for AI assistants) are edited by hand.

## Life Log (private)

`/life/` is an unlisted, `noindex` page with a password-gated personal tracker: Movies & Shows, Food (one row per item, grouped into meals), Social (monthly catch-ups), Reminders, a dashboard and an "Ask your data" box that answers simple questions in the browser with no AI. Its structure mirrors `Planning_restructured.xlsx` (genre / sub-genre dropdowns, food types, etc.).

Data is encrypted in the browser (AES-GCM, PBKDF2) and mirrored to a private Google Sheet through an Apps Script bridge, the same pattern as the game data: the bridge URL goes in `assets/js/config.js` (`LIFE_ENDPOINT`), the secret token is typed into the page once and kept only inside the encrypted vault. Setup is in `backend/LIFE-SETUP.md`. The page is deliberately not in `tools/seo.js`, the sitemap or the site navigation, and no personal data lives in this repo.
