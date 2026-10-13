# Quality baseline and results

Measured on production (`https://re-loop-ochre.vercel.app`) before the v1.0.0 work started, and again at release. Lighthouse runs in mobile mode, one run per page; scores can move by a few points between runs.

## Lighthouse (mobile), before v1.0.0 (2026-10-14)

| Page                       | Performance | Accessibility | Best practices | SEO | LCP                |
| -------------------------- | ----------- | ------------- | -------------- | --- | ------------------ |
| `/`                        | 95          | 100           | 100            | 100 | 2.8 s              |
| `/shop`                    | 87          | 100           | 100            | 100 | 3.4 s              |
| `/shop/RL-JMU-0001` (item) | 92          | 100           | 100            | 100 | 3.1 s              |
| `/sell`                    | 92          | 100           | 100            | 100 | 3.0 s              |
| `/locations`               | 87          | 100           | 100            | 100 | 3.7 s              |
| `/impact`                  | 95          | 100           | 100            | 100 | 2.7 s              |
| `/network`                 | —           | —             | —              | —   | page did not exist |
| `/help`                    | 97          | 100           | 100            | 100 | 2.5 s              |
| `/hub`                     | 94          | 100           | 100            | 63  | 2.7 s              |

`/hub` scores low on SEO on purpose: it is hidden from search engines (`noindex`).

## Links and console, before v1.0.0

`node frontend/scripts/site-audit.mjs https://re-loop-ochre.vercel.app` crawled 66 pages:

- 0 broken internal links;
- 0 pages with browser console errors or warnings;
- no `/go/` short links are linked from the site itself (they are shared on Instagram, WhatsApp and the printed QR code).

## At release

Filled in by the release batch.
