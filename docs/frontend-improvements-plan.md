# Frontend improvements plan (frontend-only phase)

## Context
`index.html` (single file, ~584 lines, ~290KB because of embedded base64 audio/image) is a prototype marketplace. Listings are a hardcoded `seed` array copied into `products`; the "Submit inventory" form only shows a toast and discards data; `contactSeller()` uses `alert()`; an autoplay intro overlay + embedded MP3 play on load. Goal: make the browser-only experience real (persistence via localStorage, photo preview, modal, validation, empty states, mobile pass) and isolate all data access so a later Supabase phase swaps only a few functions.

**Hard constraints:** no Supabase, no `.env`/env files, no network/backend code, no Vercel setup. Plain JS + localStorage only. Do not push (commit locally only).

## Steps on approval (in order)
1. Write this plan to `docs/frontend-improvements-plan.md` (no separate approval needed).
2. Implement (below).
3. Update `CLAUDE.md` (does not exist yet — create it) with a note: project is in a frontend-only phase; Supabase/Vercel/real auth deliberately deferred; no backend exists; all data access lives in the "data layer" functions.
4. `git add` + `git commit` (message ends with the Co-Authored-By line from the attribution reminder). No push.
5. Report a plain-language click-through checklist + any deviations.

## Implementation (all in `index.html`)

### A. Data layer (single seam for future Supabase)
One clearly-marked `/* DATA LAYER */` block at the top of the main `<script>` (currently line ~412). Everything else calls only these:
- Listings: `getListings()`, `getListing(id)`, `saveListing(listing)` (assigns id, `createdAt`, persists to key `reloopListings`).
- Cart: `getCart()`, `saveCart(cart)`, `addToCart`/`changeQty` operate through them (replaces direct `basket` + `localStorage` use at lines ~433-441; key `reloopBasket` kept).
- Saved/favourites: `getSavedIds()`, `saveSavedIds()` (key `reloopSaved`, currently mixed into the `favorite` monkey-patch at lines ~449-450 — fold into one clean `favorite`).
- Inquiries: `addInquiry({listingId,name,contact,message})` → key `reloopInquiries`; `getInquiries()`.
- `getListings()` returns built-in `seed` (kept as sample data) + user-saved listings. Remove the `let products=[...seed]` global; all renderers (`renderProducts`, `renderAllProducts`, `renderBasket`, `quickView`, `addToCart`, `changeQty`) call `getListings()`.
- All localStorage reads/writes wrapped in try/catch (private mode / quota) with in-memory fallback so the page never breaks.
- Header comment documents "later: replace bodies with Supabase calls; signatures stay (they may become async then)".

### B. Listing submission (form at line ~392-405, handler at ~508)
- Handler builds a listing from form fields, calls `saveListing()`, closes modal, resets form, re-renders both grids, toasts "Listing added", scrolls to it. Persists across reload (this browser only).
- New listings show a "New · pending ReLoop review" tag; seed listings unchanged.
- Escape all user text with existing `escapeHtml()` (already present at line ~499) — including the currently unescaped `p.condition` tag at ~458.

### C. Photo attach
- Keep the `<input type=file accept=image/*>`; add preview `<img>` + "Remove" button using `FileReader.readAsDataURL`.
- Reject non-images and files > 2 MB with an inline error (no alert).
- Photo held in memory for the session only (a `sessionPhotos` map keyed by listing id), NOT written to localStorage (avoids quota blow-ups; matches "session only" spec). Cards/quick view show photo if present else emoji; after reload the listing persists but falls back to emoji.
- Update the note text under the field ("not uploaded anywhere; visible until you reload").

### D. Seller-info modal replaces `alert()`
- Reuse existing `#quickModal` styling pattern; add `#contactModal` (`role=dialog`, `aria-modal`, Esc + backdrop close, hooked into the existing Escape handler at ~444).
- `contactSeller(id)` opens it showing title, condition, location, price, seller contact (user listings: the submitted contact; seed listings: "ReLoop team — inventory desk"), plus a small inquiry form (name, contact, message) with validation → `addInquiry()` → toast + close. Keeps the "prototype, no live order system" disclaimer.

### E. Validation + empty states
- Replace reliance on bare browser tooltips with inline field errors: title, category, condition, price (number ≥ 0), quantity (integer ≥ 1), location, contact (looks like email or ≥10-digit phone), confirmation checkbox; `novalidate` on the form + own checks; focus first invalid field.
- Empty states: existing `.empty` divs (lines ~457, ~495) upgraded to a proper block (icon, message naming the active search/category, "Clear filters" button). Add a `clearFilters()` for both grids. Category tiles that hit an empty category (e.g. no Recycling matches a condition filter) show it too.

### F. Remove intro overlay + music
Delete entirely: the intro style block (`#reloop-intro-style`, lines ~202-236 incl. `#reloopIntro`, `#introCore`, `#introMark`, `#introName`, intro keyframes), overlay markup (~237-242, including `#reloopIntroMask` svg), `<audio id="reloopIntroMusic">` with its base64 MP3 (~243-245; large size win), and `#reloop-intro-script` (~246-276). Also remove the stray `#introMark` overrides in the CSS block (~line 146-147 relative to CSS section) and `reloopIntroSeen` sessionStorage use. Verify with grep that no `intro`/`audio`/`.play(` references remain (leave the impact-story "intro" wording alone).

### G. Mobile pass
Add/adjust a `@media(max-width:600px)` block: modals become full-width with `max-height:92dvh` scroll, form grid single column, ≥44px tap targets on buttons/selects, toolbar inputs stack, products grid 1 column ≤420px (currently 2), cart drawer and FAB not overlapping content, basket/contact modals safe-area padding, no horizontal overflow (check nav wrap, hero buttons). Also disable the cursor-glow and 3D hover transforms on touch (`@media(hover:none)`).

## Files touched
- `index.html` (all code changes)
- `docs/frontend-improvements-plan.md` (new)
- `CLAUDE.md` (new)

## Verification
- Serve locally (`python3 -m http.server`) and click through in a browser (via the `run` skill/headless check if available); confirm no console errors.
- Submit a listing (with and without photo) → appears in both grids → reload → listing persists, photo falls back to emoji.
- Invalid form submissions show inline errors; oversized/non-image photo rejected.
- Search for nonsense / empty category → empty state + Clear filters works.
- Contact seller → modal (no `alert`), inquiry saved in `reloopInquiries`.
- No intro overlay, no audio; `grep -n -iE "audio|reloopIntro|\.play\(" index.html` returns nothing; file size drops substantially.
- Resize to ~375px width: no horizontal scroll, modals usable.
- `grep -nE "localStorage|sessionStorage" index.html` shows storage access only inside the data-layer block.
- `git status` shows commit made, nothing pushed.
