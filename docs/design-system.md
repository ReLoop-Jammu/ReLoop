# ReLoop design system

One system for the public site, the staff hub and the printables. It follows the business plan's palette and type, so the site, the plan and the printed material look like one organisation.

## Principles

- **The hub tag is the signature.** Every item carries an `RL-JMU-` tag. The tag, set in JetBrains Mono, and the loop (sources → hub → next life) are the recurring visual ideas. Monospace is used only for real identifiers: tags and receipt numbers.
- **Calm surfaces, one accent.** Sand and paper neutrals, ink text, navy for actions and links, amber only as a fill or highlight (never as text: it is too light).
- **Structure means something.** Borders, numbers and labels appear only where they carry information: a step number only for a real sequence, a label only where it names the section. Labels are sentence case, never all capitals.
- **Motion answers people.** Opening, expanding and confirming may animate; nothing moves on its own except one deliberate moment per page, and nothing moves at all when the visitor asks for reduced motion.
- **Accessible by default.** Every text colour passes WCAG AA (4.5:1) on every surface; focus is always visible; controls are at least 44 px tall on public pages.

## Tokens (`frontend/src/app/globals.css`)

| Role                | Token                                                 | Value                                                 |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Page                | `canvas` / `sand`                                     | `#f6ede2` / `#f0e1d1`                                 |
| Surfaces            | `surface`, `sunken`                                   | `#fffcf7`, `#efe2d3`                                  |
| Lines               | `line`, `line-strong`                                 | `#e2d2bf`, `#c9b39a`                                  |
| Text                | `ink`, `ink-soft`, `muted`                            | `#0e1a27`, `#3b4e66`, `#56667a`                       |
| Actions, the loop   | `brand-600` (navy)                                    | `#26436c`                                             |
| Warm accent (fills) | `gold-400` (amber)                                    | `#e9b26e`                                             |
| Status              | `success`, `warning`, `info`, `danger` (+ `-bg`)      | `#2f6b4f`, `#7a4e14`, `#2e5a88`, `#a3412f`            |
| Grades              | `grade-a` … `grade-d` (+ `-bg`)                       | as status: A success, B info, C warning ink, D danger |
| Map                 | `map-hub`, `map-route`, `map-recycler`, `map-partner` | navy, darker amber, danger, success                   |

Type: **Outfit** (headings), **Instrument Sans** (text), **JetBrains Mono** (identifiers), loaded with `next/font`. Radii: controls are pills or 8 px, cards 14 px (`rounded-card`), panels 20 px (`rounded-panel`). Shadows are rare and tinted with ink; cards sit on lines.

## Components (`frontend/src/components/ui/`)

| Component                                                | Use                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Button`, `ButtonLink`                                   | Actions (primary navy, secondary outline, dark, gold, ghost)                                  |
| `controlClasses`, `Field`, `Input`, `Select`, `Textarea` | Every form control, site and hub (`dense` for the hub)                                        |
| `Card`                                                   | Any bordered surface                                                                          |
| `Badge`, `StatusPill`                                    | Short labels and statuses (the label always says the status; colour is never the only signal) |
| `Notice`                                                 | Messages: info, warning, success, danger                                                      |
| `Table`, `Th`, `Td`                                      | Data tables that scroll sideways on phones                                                    |
| `Stat`                                                   | One figure with its label and target                                                          |
| `Timeline`                                               | Dated steps (an item's journey, a request's progress)                                         |
| `Skeleton`, `LoadingBlock`                               | Loading states                                                                                |
| `EmptyState`, `ErrorState`                               | Nothing yet, or it couldn't load (always with a next step)                                    |
| `Dialog`                                                 | Modals (native `<dialog>`)                                                                    |
| `Eyebrow`, `SectionHeading`, `Container`                 | Page structure                                                                                |

Hub screens use the same primitives through `features/hub/components/ui.tsx` (compact sizes).
