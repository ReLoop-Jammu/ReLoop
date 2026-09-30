# ADR 0001: Next.js + TypeScript on Vercel, with Supabase

- **Status:** Accepted (2026-09-30)

## Context

The site is a single ~200KB `index.html` with a localStorage data layer. It needs accounts, a shared database, photo uploads, an admin console and good SEO for listing pages.

## Decision

- Rebuild on **Next.js (App Router) + TypeScript (strict)**, deployed on **Vercel**.
- Use **Supabase** (Postgres, Auth, Storage, Row Level Security) as the backend.
- Style with Tailwind CSS and shadcn/ui, and validate with Zod.

## Why

- Server rendering gives listing pages SEO, and server-side code keeps auth and admin checks off the browser.
- Supabase RLS enforces security in the database itself, not only in UI code.
- Vercel gives a preview URL per PR, which fits the "review before merge" workflow.

## Alternatives rejected

- **Vite + React SPA:** weaker SEO and no server layer for admin checks.
- **Keep plain HTML/JS:** no components or type checking, so quality would be hard to hold as the site grows.
- **Firebase:** a NoSQL model fits relational marketplace data (listings, orgs, inquiries) worse than Postgres.

## Consequences

- More setup up front (Phase 1), and the team needs to be comfortable with React and TypeScript.
- `index.html` stays as the live site until Phase 2 replaces it.
