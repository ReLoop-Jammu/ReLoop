# ReLoop account setup

This update adds buyer/shop-owner signup, login, account page, GSTIN collection, pending shop verification, and authenticated private shop submissions.

## Before deploying

1. Confirm the target Supabase project already contains `public.shop_owners` and `public.shop_submissions` (the tables used by the current deployed form/API).
2. Review and run `backend/supabase/migrations/20261011000001_accounts_and_shop_verification.sql` in Supabase SQL Editor. It changes `shop_owners.id` to reference `auth.users(id)` and adds GSTIN/verification columns. If the table contains existing shop-owner rows whose IDs do not exist in `auth.users`, reconcile those rows before applying the migration.
3. In Supabase Authentication settings, set the Site URL to the production ReLoop URL and add its `/login` and `/account` paths to the allowed redirect URLs as needed.
4. Ensure Vercel has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key must remain server-only and must never be committed to Git.
5. Deploy to a preview first. Test buyer signup/login, shop-owner signup, and that an unverified shop owner is blocked from item submissions.

## Shop verification

New shop-owner accounts start as `pending`. GSTIN is format-checked in the form but is not independently verified by a government API in this update. After your team verifies the GSTIN/business, an authorized admin process must set `verification_status` to `verified` and set `verified_at`. Do not let the user update these fields themselves.

## Notes

- Buyer and shop-owner accounts use Supabase Auth. The database trigger creates the profile and shop-owner record.
- Shop-owner item submissions are saved as private rows in `shop_submissions`; they are not published to `listings`.
- The login helper currently stores the Supabase session in browser local storage. For a higher-security production setup, consider moving session handling to secure, HTTP-only cookies and adding rate limiting/CAPTCHA to signup and submission endpoints.
- The ZIP was not build-verified in this environment because dependency installation timed out. Check the Vercel preview build before promoting it to production.
