# ReLoop

Single-file e-waste marketplace prototype (`index.html`, plain HTML/CSS/JS, no build step).

**Current phase: frontend-only.** There is no backend. Supabase, Vercel deployment and real authentication are deliberately deferred to a later phase — do not assume any of them exist, and do not add `.env` files or network code until that phase starts.

- All data (listings, basket, saved items, inquiries) lives in the browser's localStorage only, so nothing is shared between people.
- Every read/write of that data goes through the `DATA LAYER` block at the top of the main `<script>` in `index.html` (`getListings`, `saveListing`, `getCart`, `saveCart`, `getSavedIds`, `addInquiry`, ...). When the backend arrives, swap only those functions.
- Listing photos are preview-only and kept in memory for the session (not persisted).
- Plan for this phase: `docs/frontend-improvements-plan.md`.
