# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-09-06

Polish round: a11y, dark theme, motion, icons, and a first testing/CI
foundation. No breaking changes.

### Added

- Dark theme via `prefers-color-scheme`. Light surfaces (feature cards,
  About dialog, page body between hero and features) flip; the hero,
  HUD, and split canvas were already dark and stay put.
- Semantic dark-mode text tokens on `:root`: `--dark-text-muted`,
  `--dark-text-dim`, `--dark-text-faint`, calibrated for WCAG 4.5:1
  body-text contrast on the HUD background.
- Vitest suite with 33 regression tests across `parseSvg`, `fetchFont`,
  and the `extractUsedCodepoints` half of `subsetFont`. Focused on the
  gotchas already captured in `LEARNINGS.md`.
- GitHub Actions CI: runs `npm ci`, `npm run lint`, `npm test`, `npm
  run build` on every PR and non-`main` push.
- Minimal ESLint flat config (bugs only, no formatting opinions) plus
  `npm run lint` script.
- `CLAUDE.md` agent guide and `RULES.md` documenting the non-obvious
  constraints from `LEARNINGS.md`.
- `commit-msg` hook (`.githooks/commit-msg`) blocking AI-attribution
  trailers. Enabled automatically via `npm run prepare`.
- Report surfaces the final embedded base64 payload size after
  subsetting (`Embedded: N KB font · ~M KB base64 payload in SVG`).
- Report warns when a bare family name (e.g. `Roboto`, no `-Bold`
  suffix) defaults to weight 400 — signals the ambiguity that
  silently causes wrong-weight output.
- Sample buttons carry explicit `aria-label`s so screen readers pause
  between the name and its hint.
- README carries a CI status badge.

### Changed

- HUD button icons: replace unicode glyphs (`↺⎘↓✕`) with matching
  lucide-style inline SVGs. Notably `⎘` renders as boxes on many
  systems.
- Wave animations: drop `infinite`. One gentle entrance bob per wave,
  then hold. Removes the "looping ambient motion" anti-pattern.
- Dropzone controls (`Choose file`, `Paste SVG`, kbd chips): switch to
  darker chip backgrounds (~6:1 contrast) — the previous white-tinted
  overlays computed to ~4:1 on the purple accent.
- Muted HUD text (`.hud-report`, `.upload-face-label`,
  `.detect-local-note`, and friends): lifted to token-driven contrast
  that meets 4.5:1.
- SVG preview default zoom `0.75 → 0.6` so content has real breathing
  room from the pinned HUDs. Cmd+= / scroll still zoom to full fit.
- Preview renders inside a soft `drop-shadow`, so a white SVG on the
  dark checkered canvas reads as a floating document card.
- Samples strip label: "Or try a broken sample" → "Or try a sample"
  (the old copy read as a warning; hints on each card already flag
  what's tricky about a specific SVG).
- `inter-headline.svg` sample: 34px face with 44px leading (was 36 /
  32, which forced descender-into-ascender collisions), wider centered
  `NEW` badge; viewBox height 200 → 220.

### Fixed

- Split handle: `aria-orientation` was `vertical` on a horizontal
  slider — corrected to `horizontal` to match the ArrowLeft/Right
  keyboard handler. Restored a visible focus outline on the grip
  (previously `outline:none`).
- Blob-URL `<img>` in the before pane: added `alt=""` (decorative;
  a screen reader shouldn't recite a blob URL).
- `.hud-report` scrollable region: added `tabindex="0"` so keyboard
  users can scroll the status log when it overflows.
- About dialog focus lifecycle: mouse-opened dialogs left focus on
  `document.body` on close. Explicit focus restore via
  `setTimeout(0)` in every close path (button, backdrop, Escape).
- About dialog `aria-expanded` correctly toggles false on every close
  path (was only wired to the direct button click).
- "BEFORE" pane label offset now clears the wider "New file" button.
  Was clipped to "RE" behind a button sized for a bare "×" close.
- Build broken on `main` after the vite 5→8 and svgo 3→4 dep bumps
  landed with a stale `svgo/dist/svgo.browser.js` import path. The
  browser import path was updated in the dep-bump PR itself (verified
  in this branch's CI).

### Dev / tooling

- `happy-dom` as devDep so `extractUsedCodepoints` tests can use
  `DOMParser` in the Node test env.
- New npm scripts: `test`, `test:watch`, `lint`, `prepare` (the last
  auto-configures `core.hooksPath` to `.githooks`).
- `.story/` directory: storybloq roadmap, tickets, issues, handovers,
  and two process lessons captured during this round.

## [0.1.0]

Initial pre-release — original ship of the browser-side SVG font
embedder. Fontsource resolver, deprecated `<font>` block stripper,
fontkit-based glyph subsetting, SVGO pass with the two font-hostile
plugins disabled, dropzone/split-view UI.
