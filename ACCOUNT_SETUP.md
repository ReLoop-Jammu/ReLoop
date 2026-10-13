# ReLoop account setup

Buyer and shop-owner sign-up, login, the account page, GSTIN collection, shop verification, private shop submissions and staff-only hub access.

## How it works

- Sign-up, login and logout go through `/api/auth/*` on the website. The session is kept in **HttpOnly cookies**, so page scripts can never read a token. Expired sessions renew themselves.
- A database trigger creates the profile (and the shop-owner record) when someone signs up. It tidies odd names, phones and GSTINs instead of failing, and a visitor can only ever become a `buyer` or `shop_owner`.
- New shop owners start as `pending`. A GSTIN is format-checked but **not** verified against a government service. Staff review it and call `public.review_shop_owner(...)` (see `backend/README.md`). Owners cannot change their own status or role.
- Verified shops submit stock at `/sell/shops`. Rows are private (owner and staff only); nothing is published to the shop.
- `/hub` requires a signed-in user who is listed in `public.staff`.

## Before deploying

1. Create the Supabase project and apply **all** migrations in order (`npx supabase db push --workdir backend`). They create every table the site needs, including `shop_owners`, `shop_submissions` and `institution_submissions`, so a fresh project works.
   - _Reusing the earlier project?_ The base-tables migration changes nothing where tables already exist, and the last migration aligns the constraints. If `public.shop_owners` has rows whose ids are not in `auth.users`, reconcile them first.
2. In Supabase → Authentication, set the **Site URL** to the production URL and add the preview and `localhost:3000` redirect URLs. Keep **Email confirmation** on.
3. In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (server-only, mark Sensitive). Do **not** set `INSECURE_OPEN_HUB`.
4. Add the first hub admin after they sign up:
   ```sql
   insert into public.staff (user_id, full_name, role)
   select id, 'Name', 'admin' from auth.users where email = 'you@example.com';
   ```
5. Fill in the business details (`NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_WHATSAPP`, the grievance officer, and so on) from `frontend/.env.example`.
6. Deploy to a preview first. Check: buyer sign-up and login, shop-owner sign-up, that an unverified shop is blocked from submitting, that a non-staff account cannot open `/hub`, and that the institution booking form saves.

## Abuse protection

Public endpoints check the request origin, include a hidden honeypot field, validate every field, cap request size and are rate-limited (in-process and through `public.hit_rate_limit`, which needs the last migration). Adding a CAPTCHA (for example Cloudflare Turnstile) in front of sign-up is a sensible next step if abuse appears.

## Notes

- This version has not been built or run in the environment where it was written (no network for dependency install). Run `npm run check` and `npm run test:e2e` and check the Vercel preview build before promoting it to production.
