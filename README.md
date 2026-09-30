# ReLoop

Marketplace for used electronics and e-waste: collected in Jammu, sold across India.

- Architecture and roadmap: [docs/architecture.md](docs/architecture.md)
- Engineering standards (mandatory): [docs/engineering-standards.md](docs/engineering-standards.md)
- Decisions: [docs/adr/](docs/adr/)

## Getting started

Requires Node.js 22 or newer.

```sh
npm install
cp .env.example .env.local   # optional for now
npm run dev                  # http://localhost:3000
```

## Scripts

| Command            | What it does                                     |
| ------------------ | ------------------------------------------------ |
| `npm run dev`      | Start the dev server                             |
| `npm run build`    | Production build                                 |
| `npm run check`    | Lint, typecheck, format check and unit tests     |
| `npm test`         | Unit tests (Vitest)                              |
| `npm run test:e2e` | Browser tests on desktop and mobile (Playwright) |
| `npm run format`   | Format all files (Prettier)                      |

Commits must follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`…); a git hook checks this and runs lint and formatting on staged files.

`index.html` is the original single-file prototype, kept for reference until it is retired.
