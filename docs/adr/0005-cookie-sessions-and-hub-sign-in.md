# 0005. Cookie sessions, server-side submissions and a staff-only hub

Date: 2026-10-13. Status: accepted.

## Context

The first accounts release kept Supabase tokens in `localStorage`, never refreshed them, left `/hub` open to anyone who knew the URL, let anonymous visitors write to a table with the service-role key without limits, and assumed tables that no migration created.

## Decision

- Sessions live in HttpOnly, SameSite=Lax cookies set by `/api/auth/*`. The browser asks `/api/auth/session` who it is; it never holds a token. Expired access tokens are renewed from the refresh cookie.
- `/hub` is checked on the server: a signed-in user who is in `public.staff`. With no Supabase project it stays locked; `INSECURE_OPEN_HUB=true` opens it for local development and browser tests only.
- Public and authenticated POST endpoints share one pattern: same-origin check, honeypot, zod validation with fixed fields, a small body limit, and rate limits (in-process plus `public.hit_rate_limit`).
- Every table the site needs is created by a migration; the shop reads live stock from `items` (falling back to the exported stock file) instead of a separate legacy table.
- Shop verification is changed only by staff through `public.review_shop_owner`.

## Consequences

- Cookies need a same-site deployment (the website and its API routes share one origin, as they do on Vercel).
- Hub data is still per-device until the Supabase adapter lands; the sign-in only protects access to the tool.
- A CAPTCHA and a full script-src Content-Security-Policy remain for Phase 7.
