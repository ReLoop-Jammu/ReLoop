# ReLoop

Marketplace for used electronics and e-waste: collected in Jammu, sold across India.

## Project layout

| Folder                   | What lives there                                                          |
| ------------------------ | ------------------------------------------------------------------------- |
| [`frontend/`](frontend/) | The website: Next.js 16, TypeScript, Tailwind CSS. Deployed to Vercel.    |
| [`backend/`](backend/)   | The database: Supabase schema, security rules, storage, seed data, tests. |
| [`docs/`](docs/)         | Architecture, engineering standards, decision records (ADRs).             |
| [`legacy/`](legacy/)     | The original single-file prototype, kept for reference only.              |

Read [docs/architecture.md](docs/architecture.md) and [docs/engineering-standards.md](docs/engineering-standards.md) before contributing.

## Getting started

Requires Node.js 22 or newer.

```sh
npm install            # installs frontend and backend (npm workspaces)
npm run dev            # website on http://localhost:3000
```

## Editor

Open the repo root in VS Code and install the recommended extensions when prompted (Tailwind CSS, ESLint, Prettier). The shared settings in `.vscode/` make the editor understand Tailwind's `@theme` / `@apply` rules and format on save.

## Commands (run from the repo root)

| Command            | What it does                                                         |
| ------------------ | -------------------------------------------------------------------- |
| `npm run dev`      | Start the website locally                                            |
| `npm run build`    | Production build of the website                                      |
| `npm run check`    | Formatting, lint, type checks, frontend unit tests, backend DB tests |
| `npm run test:e2e` | Browser tests on desktop and mobile (Playwright)                     |
| `npm run format`   | Format all files                                                     |

Commits follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`…). Git hooks enforce this and lint staged files.

## Deploying

On Vercel, set the project's **Root Directory** to `frontend`.
