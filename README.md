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
