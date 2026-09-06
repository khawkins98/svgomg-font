# CLAUDE.md

Guidance for AI coding agents working in this repo. Read this before touching code so you don't rebuild context that already exists elsewhere.

## What this is

**svgomg-font** — client-side browser tool for fixing broken SVG fonts. Drop in an SVG that references web fonts by name (`font-family: Roboto-Bold`); get back the same SVG with those fonts embedded as base64 WOFF2 so text renders reliably in `<img>` tags, emails, and sandboxed contexts.

- Single-page Vite + vanilla JS app. No framework, no backend, no data.
- Deployed statically to GitHub Pages via `.github/workflows/deploy.yml`.
- Everything runs in the user's browser — no upload, no accounts.

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

The full list is in `RULES.md`. Highlights:

- Never enable SVGO `inlineStyles` or `minifyStyles`. They break embedded font blocks.
- Validate WOFF2 magic bytes (`77 4F 46 32`) on every fetch — a 404 HTML body base64-encodes silently otherwise.
- Match local fonts by `.postscriptName` first, `.family` second.
- The `font-family` regex negated set must include `{}` — minified CSS gets swallowed as one giant match without it.
- `fontkit` is dynamic-imported (`import('fontkit')` inside `subsetFontIfPossible`), never at module top level.
- The "before" pane preview must not inherit the document's `@font-face` rules.

## Working on this repo

- `npm run dev` — Vite dev server at `http://localhost:5180/svgomg-font/`.
- `npm test` — vitest, currently 33 tests covering the LEARNINGS.md gotchas.
- `npm run build` — production build to `dist/`.
- CI runs tests + build on every PR (`.github/workflows/ci.yml`); deploy runs on push to main.
- `.githooks/commit-msg` blocks AI-attribution trailers. `npm install` wires it up via the `prepare` script.

## Ticket flow

Roadmap, tickets, issues, and handovers live in `.story/` (storybloq). When starting new work, invoke the storybloq skill to load context — the last session's handover already knows what's in flight, what shipped, and what the current gotchas are. Update ticket/issue status **in the same commit as the code** (see lesson L-001 — deviations create ledger drift).

## What this codebase deliberately doesn't do

- **No TypeScript.** Vanilla JS with JSDoc for the surface where it matters.
- **No component framework.** DOM APIs directly.
- **No test framework beyond vitest.** No Playwright, no visual regression.
- **No linter yet.** ESLint/prettier is a reasonable follow-up but not in place.
- **No i18n.** English-only UI copy.

Deep design context (why every technical choice was made): `LEARNINGS.md`.
