# ReLoop signup fix

This patch adds frontend validation for profile name/phone and a Supabase migration that validates the same fields before inserting a profile. It does not weaken or remove the database constraints.

## Required: apply the SQL to the live Supabase project

1. Open Supabase Dashboard for the ReLoop project.
2. Open **SQL Editor** → **New query**.
3. Open `backend/supabase/migrations/20261013000001_fix_signup_phone_validation.sql` in VS Code / Notepad.
4. Copy the entire SQL file into the Supabase SQL Editor and click **Run**.
5. Confirm it says Success.

Do not paste TypeScript/JavaScript into the SQL Editor. Only the migration SQL goes there.

## Deploy the frontend

1. Replace the project files with this patched project (or copy the two changed frontend files into your existing repo):
   - `frontend/src/lib/auth-client.ts`
   - `frontend/src/app/(site)/register/page.tsx`
2. Commit and push to GitHub so Vercel redeploys.
3. Test with a phone number 6–20 characters long, a name 2–100 characters long, and a new email address.

If signup still fails, open Supabase Logs → Postgres and check the timestamp of the newest failure. The new function should report a message starting `ReLoop signup:` if the supplied profile details fail validation. A new email may be needed for a clean test if the previous signup created an Auth user.
