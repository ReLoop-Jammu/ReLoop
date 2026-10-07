# Team setup: accounts, access and keys

What each teammate needs to create so the website can go live. Work through it top to bottom; later steps depend on earlier ones.

**Ground rules for secrets**

- Never paste keys or passwords into chat, email, GitHub issues or code.
- Real keys go in only two places: the **Vercel → Project → Settings → Environment Variables** page, and each developer's own `frontend/.env.local` file (which git ignores).
- Share keys between teammates through a password manager (Bitwarden or 1Password).
- Use a shared team email (e.g. `tech@<your-domain>`) as the owner of every account, so access doesn't depend on one person.

---

## 1. GitHub (repo admin, today)

The repo is `ReLoop-Jammu/ReLoop`. Someone with **admin** rights should:

1. **Protect `main`:** Settings → Branches → Add rule for `main`:
   - ☑ Require a pull request before merging
   - ☑ Require status checks to pass, and pick **Lint, types, unit tests, build** and **Browser tests**
   - ☑ Do not allow bypassing the above settings
2. **Turn on Dependabot alerts:** Settings → Code security → enable Dependabot alerts and security updates.
3. **After Vercel is live (step 3):** Settings → Pages → set the source to **None**. The old prototype link stops working, and the real site replaces it.

## 2. Supabase: database and logins (needed for Phase 3)

1. Sign up at **supabase.com** with the team email and create an **organization** called "ReLoop".
2. **New project:**
   - Name: `reloop-prod`
   - Region: **South Asia (Mumbai)**
   - Database password: generate a strong one and store it in the password manager. It's only needed for the CLI.
3. **Invite developers:** Organization → Team → Invite (role **Developer**; **Owner** for the lead).
4. **Authentication → URL Configuration:**
   - Site URL: the production URL (e.g. `https://reloop.in`), or the Vercel URL until a domain exists
   - Redirect URLs: add `http://localhost:3000/**` and `https://re-loop-*-re-loop-jammu.vercel.app/**` (Vercel previews)
5. **Authentication → Providers:** keep **Email** on. Google is set up in step 5.
6. **Copy keys** from Project Settings → API Keys into Vercel and `.env.local` (names below):
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key → `SUPABASE_SECRET_KEY` (**server only**; never in browser code, never prefixed `NEXT_PUBLIC_`)
7. **Apply the database schema** (one developer, from the repo root):
   ```sh
   npx supabase login
   npx supabase link --workdir backend --project-ref <project-ref>
   npx supabase db push --workdir backend
   ```
8. **Make the first admin:** after that person signs up on the site, run this in the Supabase **SQL Editor**:
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'their@email');
   ```
   Admin rights can only be given this way, never from the website.

> Optional: a second project, `reloop-staging`, for testing changes before production.

## 3. Vercel: hosting (already set up)

The project lives on one teammate's **Hobby** (free) Vercel account, as `re-loop` under `re-loop-jammu`. Hobby has a single member, so only that teammate can change settings. Everyone else works through GitHub:

- every push to a branch builds a **preview** link, posted on the pull request by Vercel;
- merging to `main` updates the **live** site.

**Settings only the Vercel owner can change:**

1. **Make preview links viewable** (needed to review pull requests): Project → **Settings → Deployment Protection** → **Vercel Authentication** → set to **Disabled**, then Save. Previews then open for anyone with the link. Previews are hidden from search engines, and the staff hub keeps its data on each device, so nothing private is exposed.
2. **Root Directory** must be `frontend` (Settings → Build and Deployment). It already builds, so it's set.
3. **Environment Variables** (Settings → Environment Variables), for Production and Preview:

   | Name                                   | Value                                           | Needed from   |
   | -------------------------------------- | ----------------------------------------------- | ------------- |
   | `NEXT_PUBLIC_SITE_URL`                 | the production URL (Vercel → Project → Domains) | now           |
   | `NEXT_PUBLIC_SUPABASE_URL`             | from Supabase                                   | Supabase step |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from Supabase                                   | Supabase step |
   | `SUPABASE_SECRET_KEY`                  | from Supabase (mark **Sensitive**)              | Supabase step |

4. **Analytics:** Project → **Analytics** → enable **Web Analytics**, and **Speed Insights** → enable (free on Hobby). Then add the environment variable `VERCEL_ANALYTICS` = `on` (Production) and redeploy. The site only loads the analytics scripts when this is `on`, so visitors never see errors before Analytics is enabled.
5. After any settings change, redeploy: Deployments → latest → **⋯ → Redeploy**.

> **Before ReLoop starts selling:** Vercel's Hobby plan is for non-commercial use only. Once the shop takes real orders, the project should move to a **Pro** team (paid, per member), which also allows adding developers. Until then, previews and the early-preview site are fine on Hobby.

## 4. Domain (whenever ready)

1. Buy the domain (e.g. a `.in` name) from any registrar, owned by the team account.
2. Vercel → Project → Settings → Domains → add it, then copy the DNS records Vercel shows into the registrar.
3. Update `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL to the new domain.

## 5. Google sign-in (Phase 4)

1. In **console.cloud.google.com**, create a project called "ReLoop".
2. Set up the OAuth consent screen: External, with the app name, support email and the domain's privacy policy URL (`/privacy`).
3. Credentials → Create **OAuth client ID** (Web):
   - Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Paste the Client ID and Secret into **Supabase → Authentication → Providers → Google**. They don't go in Vercel or the code.

## 6. Email sending: Resend (Phase 6)

Used for inquiry and moderation emails.

1. Sign up at **resend.com** → Domains → add the domain, and add its DNS records at the registrar.
2. Create an API key (Sending access) → Vercel `RESEND_API_KEY`.
3. Decide the sender address, e.g. `ReLoop <hello@your-domain>`.
4. Optional: use Resend as Supabase's email sender too (Supabase → Auth → SMTP), so login emails come from your domain.

## 7. Spam protection: Cloudflare Turnstile (Phase 6)

1. **dash.cloudflare.com** → Turnstile → Add site, with hostnames for the domain and `localhost`.
2. Site key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; Secret key → `TURNSTILE_SECRET_KEY`.

## 8. Error tracking: Sentry (Phase 7)

1. **sentry.io** → create a Next.js project called `reloop-web`.
2. DSN → `SENTRY_DSN`; create an auth token for source maps → `SENTRY_AUTH_TOKEN`.

## 9. Payments: Razorpay (later, but start KYC early)

Business verification can take days to weeks. It needs the registered business name, PAN, bank account and GST details (if registered). Don't create API keys until the payments phase.

---

## Business details the website needs

Fill these in `frontend/src/lib/site.ts`. They appear in the footer, legal pages and emails.

- [ ] Legal name of the business / organisation and registered address
- [ ] Support email and phone number shown to buyers
- [ ] **Grievance officer** name and email (required by India's IT Rules and DPDP Act for platforms like this)
- [ ] GSTIN, if registered
- [ ] Names of authorised e-waste recyclers ReLoop works with (for the Recycling category)
- [ ] Legal review of the draft **Privacy Policy** and **Terms of Use** at `/privacy` and `/terms`

## What to send the developer (and what not to)

| Send ✅                                                 | Never send ❌                    |
| ------------------------------------------------------- | -------------------------------- |
| "Supabase project is created and keys are in Vercel"    | Any key, password or token       |
| Supabase project ref (e.g. `abcd1234`); it's not secret | The database password            |
| An invite to the Supabase org                           | The Supabase secret key          |
| The Vercel preview / production URL                     | Google / Resend / Sentry secrets |
| Business details from the list above                    |                                  |
