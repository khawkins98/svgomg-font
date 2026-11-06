# CLAUDE.md

Guidance for AI coding agents working in this repo. Read this before touching code so you don't rebuild context that already exists elsewhere.

## What this is

**svgomg-font** — client-side browser tool for embedding fonts in SVGs. Start with
[README usage and limitations](README.md#usage) and [ABOUT.md](ABOUT.md) for the
current pipeline and output formats.

- Single-page Vite + vanilla JS app. No framework or backend.
- Deployed statically to GitHub Pages via `.github/workflows/deploy.yml`.
- SVG/font files are processed in the browser; font lookup makes CDN requests.

## Where the important stuff lives

- **`index.html`** — the whole UI shell. Two visual states, gated by `body.has-file`: landing (dropzone + samples + feature cards + About dialog) vs loaded (split-view canvas + HUD panels).
- **`src/main.js`** — orchestration. Reads options, calls the pipeline, renders reports and font-face rows.
- **`src/lib/parseSvg.js`** — regex-based font-family extraction. Also detects and strips deprecated `<font>` blocks.
- **`src/lib/fetchFont.js`** — Fontsource-via-jsDelivr resolver. Parses family names (including PSMT/MT/PS PostScript suffixes) into base + weight + style, then fetches the WOFF2.
- **`src/lib/subsetFont.js`** — fontkit-based glyph subsetting (lazy-imported so it doesn't bloat first paint).
- **`src/lib/embedFonts.js`** — the actual `@font-face` block insertion.
- **`src/lib/optimize.js`** — SVGO pass with `inlineStyles` and `minifyStyles` **disabled** (they mangle embedded fonts).
- **`src/style.css`** — all CSS. Uses tokens on `:root`; dark mode flips them under `prefers-color-scheme: dark`.

## Rules to follow

Read [RULES.md](RULES.md) before editing the pipeline. It is the maintained home
for SVGO safety, font validation/matching, regex boundaries, lazy imports, and
preview isolation constraints.

## Working on this repo

Follow [CONTRIBUTING.md](CONTRIBUTING.md#local-setup) for setup, checks, commit/PR
conventions, and documentation maintenance. `package.json` and the workflows are
the executable sources for commands and automation.

## Ticket flow

Roadmap, tickets, issues, and handovers live in `.story/` (storybloq). When starting new work, invoke the storybloq skill to load context — the last session's handover already knows what's in flight, what shipped, and what the current gotchas are. Update ticket/issue status **in the same commit as the code** (see lesson L-001 — deviations create ledger drift).

## What this codebase deliberately doesn't do

- **No TypeScript.** Vanilla JS with JSDoc for the surface where it matters.
- **No component framework.** DOM APIs directly.
- **No test framework beyond vitest.** No Playwright, no visual regression.
- **ESLint checks bugs**, without formatting rules. No Prettier setup.
- **No i18n.** English-only UI copy.

Research and failed experiments: [LEARNINGS.md](LEARNINGS.md). Treat historical
observations there and in `.story/` as records, not current feature inventories.
