# ReLoop v1.0.0: final report

**Status (2026-10-15):** built and tested on the branch `release/v1`; not yet applied to the databases, merged to `main` or tagged. Those steps need secrets and are in `scripts/finish-v1-local.md`. Items marked _(local)_ are filled in by that session.

## What was built

Batches 15b and 16 to 27, each on its own branch and merged into `release/v1` only when `npm run check` and the browser tests passed. No pull requests were opened for them: the cloud session had no GitHub CI runner, so the same commands ran locally before every merge. The whole branch is reviewed as one when it is merged to `main`. See `CHANGELOG.md` and `docs/progress.md` for the detail.

| Batch | What                                                                  |
| ----- | --------------------------------------------------------------------- |
| 15b   | Business Plan v2: scrap by weight, bins, Parts Exchange, lots, rules  |
| 16    | Impact and network flows, buyer areas                                 |
| 17    | Core redesign, trust strip, error and loading screens                 |
| 18    | Wording pass: opening date only on locations and contact              |
| 19    | Hub today panel, skip link, search shortcut                           |
| 20    | Route run sheet and repair board                                      |
| 21    | Capacity, battery ledger, institution handover record                 |
| 22    | Staff pricing: margins, benchmarks, suggested prices                  |
| 23    | Partner directory, shop dashboard, window badge                       |
| 24    | Ledger, monthly reports, open data, activity feed                     |
| 25    | Standards, compliance, about, FAQ, accessibility pages                |
| 26    | Quality gates, dead code removed, architecture docs                   |
| 27    | Changelog, guides, feature freeze, this report, the local finish list |

## Gates (handoff section 8)

| Gate            | Result in the cloud session                                                                                                                                                              | Still to do                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Tests           | Pass: 254 database tests (PGlite), 244 unit tests, about 390 browser tests on desktop and phone, all green.                                                                              | _(local)_ simulation journeys on the demo and a local sim build      |
| Journeys        | Pass without a database (CI mode). New simulation journeys written for every batch.                                                                                                      | _(local)_ `npm run test:sim`; temporary-account checks on production |
| Lighthouse      | Not run (no Lighthouse in the sandbox).                                                                                                                                                  | _(local)_ mobile scores, before/after table                          |
| Console         | Pass on every page (third-party resources that fail behind the sandbox proxy are ignored; same-site errors fail the test).                                                               | _(local)_ sweep signed in as each role on the simulation             |
| Links           | Pass: every internal link on every public page resolves; every `/go/` link redirects.                                                                                                    | _(local)_ crawl of the demo                                          |
| Responsive      | Pass: no horizontal overflow at 360, 768, 1024 and 1280 px on every public page.                                                                                                         | Tap-target audit by hand                                             |
| Forms and lists | New screens have loading, empty and error states; covered by unit and browser tests where they run without a database.                                                                   | _(local)_ hub screens with data                                      |
| Metadata        | Pass: a title and description on every public page; sitemap and robots keep hub, account, sign-in and receipts out.                                                                      |                                                                      |
| Copy            | Pass: the claims scan runs over every public route (nav, footer, sitemap); the hub opening date appears only on `/locations` and `/contact`.                                             | Native-speaker check of the Hindi on `/help`                         |
| Security        | Pass on the repo schema: live checks 20 to 38 true in PGlite; leak scan of shop HTML and page data finds no buy price or supplier field; `npm audit --omit=dev` finds 0 vulnerabilities. | _(local)_ all 81 checks on production after the migrations           |
| Cleanup         | `/resend-confirmation` removed; architecture and limitations docs updated.                                                                                                               | _(local)_ delete merged branches on the remote                       |
| Screenshots     | Not taken (no production or demo access).                                                                                                                                                | _(local)_                                                            |
| Release         | CHANGELOG, feature-freeze section, this report, `scripts/finish-v1-local.md`.                                                                                                            | _(local)_ tag `v1.0.0`, GitHub release, final backup, Keychain       |

## URLs

- Production: `https://re-loop-ochre.vercel.app` (the domain must stay on the project: printed QR codes use it).
- Demo (simulation): `https://re-loop-demo-beige.vercel.app`.

## What could not be done here

- Anything that needs a secret, a database or Vercel (the full list, in run order, is `scripts/finish-v1-local.md`).
- The business plan's money figures: they are staff-only settings and a gitignored local input file, filled in locally.
- `npm audit` (with development tools) reports high advisories in the lint toolchain only (`micromatch` under `eslint-config-next`); the fix is a breaking upgrade, documented in `docs/known-limitations.md`.

## Ten-minute checklist per role (after the release)

**Visitor:** open the home page (trust strip, impact counter, loop sketch); `/shop`, filter by grade, open an item (grade, ReLoop Checked, passport); `/shop?kind=parts`; `/rate-card`; `/impact` and `/network` (pilot-starting text if there is no data yet); `/ledger`, `/reports`, `/data`; `/standards`, `/compliance`, `/about`, `/faq`.

**Buyer:** register, save an item, reserve one, open `/account` (requests, saved items, warranty), check that no buy price or margin appears anywhere.

**Shop owner:** register as a shop owner, wait for verification, open `/account` ("Your partnership", weigh-ins, receipts), `/account/parts` (list a tested part), `/help` in English and Hindi.

**Hub staff:** `/hub` (today panel, to-dos, capacity alerts); intake an item (ownership tick, suggested price); `/hub/route` for the next route day; record a weigh-in; `/hub/capacity`; `/hub/repairs`; `/hub/exchange`; `/hub/lots` (handover record PDF); `/hub/pricing`.

**Admin:** `/hub/settings` (finance and VRRG values, launch dates, rack slots, route markets); `/hub/partners` (directory consent); `/hub/shops` (verify a shop); `/hub/team`; `/hub/audit`.
