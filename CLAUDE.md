# CLAUDE.md

Guidance for AI coding agents working in this repo. Read this before touching code so you don't rebuild context that already exists elsewhere.

## What this is

**svgomg-font** — a client-side SVG font embedder built with Vite and
vanilla JS. [README.md](README.md) is the maintained user guide;
[ABOUT.md](ABOUT.md) explains the motivation. Font lookup makes network
requests, but the SVG and supplied fonts are processed locally.

## Where the important stuff lives

- **`index.html`** — the whole UI shell. Two visual states, gated by `body.has-file`: landing (dropzone + samples + feature cards + About dialog) vs loaded (split-view canvas + HUD panels).
- **`src/main.js`** — orchestration, installed-font access, and font uploads. Reads options, calls the pipeline, renders reports and font-face rows.
- **`src/lib/parseSvg.js`** — regex-based font-family extraction. Also detects and strips deprecated `<font>` blocks.
- **`src/lib/fetchFont.js`** — Fontsource-via-jsDelivr resolver. Parses family names (including PSMT/MT/PS PostScript suffixes) into base + weight + style, then fetches the WOFF2.
- **`src/lib/subsetFont.js`** — fontkit-based glyph subsetting (lazy-imported so it doesn't bloat first paint).
- **`src/lib/embedFonts.js`** — the actual `@font-face` block insertion.
- **`src/lib/optimize.js`** — SVGO pass with `inlineStyles` and `minifyStyles` **disabled** (they mangle embedded fonts).
- **`src/style.css`** — all CSS. Uses tokens on `:root`; dark mode flips them under `prefers-color-scheme: dark`.

## Rules to follow

Read [RULES.md](RULES.md) before editing the pipeline. It is the maintained
home for SVGO, font validation/matching, regex, bundle, and preview-isolation
constraints.

## Working on this repo

Use [CONTRIBUTING.md](CONTRIBUTING.md#local-setup) for Node requirements and
setup, and [its checks section](CONTRIBUTING.md#checks-before-a-pull-request)
for validation and the current CI runtime limitation. Keep those instructions
there rather than copying command lists or test counts here.

## Ticket flow

Roadmap, tickets, issues, and handovers live in `.story/` (storybloq). When starting new work, invoke the storybloq skill to load context — the last session's handover already knows what's in flight, what shipped, and what the current gotchas are. Update ticket/issue status **in the same commit as the code** (see lesson L-001 — deviations create ledger drift).

## Technology choices

- **No TypeScript.** Vanilla JS with JSDoc for the surface where it matters.
- **No component framework.** DOM APIs directly.
- **No test framework beyond vitest.** No Playwright, no visual regression.
- **ESLint checks bugs, not formatting.** No Prettier configuration.
- **No i18n.** English-only UI copy.

Recorded design context and experiments: [LEARNINGS.md](LEARNINGS.md).
For documentation placement and upkeep, see
[Maintaining documentation](CONTRIBUTING.md#maintaining-documentation).
