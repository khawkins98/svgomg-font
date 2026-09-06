# Design cleanup + test/CI foundation

Long autonomous session that closed every finding from the `/story design` review, laid the vitest foundation, and reconciled the ledger against merged PRs the ledger had drifted from.

## What shipped (in commit order on main)

| Commit    | What                                                              |
|-----------|-------------------------------------------------------------------|
| 80cf4fe   | fix(a11y): split-handle aria-orientation + focus outline (ISS-004)|
| 3da65f6   | fix(a11y): dark-mode text tokens at WCAG 4.5:1 (ISS-005)          |
| 1e238c2   | feat(theme): prefers-color-scheme dark palette (ISS-006)          |
| 321e478   | fix(motion): one-shot wave entrance, drop `infinite` (ISS-007)    |
| 37acb65   | fix(icons): lucide SVGs for replace/download/copy/close (ISS-008) |
| 9952629   | test: vitest + 27 regression tests for parseSvg/fetchFont (T-006) |
| c13f551   | ci: PR-triggered build + test workflow (T-007)                    |
| 5c48c74   | chore: commit ledger updates                                      |

Also marked T-001 and T-008 complete — both already lived on main from earlier PRs (#6 and the existing deploy.yml) but the ledger hadn't caught up. That drift is the main procedural lesson from this run — see below.

## Design cleanup pass

Two design tokens introduced that should be treated as the source of truth going forward:

- `--dark-text-muted` (.82 white) — body/status text on dark HUD/hero. Calibrated for 4.5:1.
- `--dark-text-dim` (.70), `--dark-text-faint` (.60) — supplementary meta on dark. Reserved for large text / annotations only — NOT for body copy.

Dark theme scope: only the light surfaces (page body between hero and features, feature cards, About dialog) flip. Hero, HUD, split canvas, samples strip are already dark and stay. `--card` was picked at #251844 to elevate above `--bg` #1a0f2e without competing with the hero.

Feature-card art (fv-half, fv-browser, fv-compare) deliberately kept its bright illustration palette inside the dark card — treated as content, not chrome.

Wave animations: `infinite` dropped on all three paths; keyframes oscillate around the base position so one iteration reads as a subtle entrance bob, then quiet. Delays preserved for the staggered reveal.

## Test foundation

Vitest set up with zero config (natural fit for Vite). 27 tests / 88ms in two files:

- `src/lib/parseSvg.test.js` — extractFontFamilies (including the `{}` boundary LEARNINGS.md guard), extractFontFaces, hasDeprecatedSvgFonts, stripDeprecatedSvgFonts.
- `src/lib/fetchFont.test.js` — parseFamily (including PSMT/MT/PS suffix stripping), normalizePostScriptName, fetchFontAsBase64 (fetch mocked, WOFF2 magic-byte pass/fail, latin-ext fallback).

`subsetFont.js` deferred — fontkit's browser-native surface is harder to isolate cleanly and better covered by future integration tests.

## CI

`.github/workflows/ci.yml` runs on pull_request against main and push to any non-main branch. Steps: node 20 with npm cache, `npm ci`, `npm test`, `npm run build`. Complements the existing `deploy.yml` (which handles push-to-main + gh-pages).

Lint step deferred — no linter configured yet. Small follow-up: add eslint + prettier and a `lint` script; ci.yml then just gains a `- run: npm run lint` line.

## Procedural lesson: ledger drift

This session opened with the ledger reporting T-001 inprogress when the fix had actually shipped in PR #6, and ISS-009 (build broken) filed against a state that PR #9 had already resolved before I ever noticed. **Root cause:** ticket status updates weren't landing alongside the code that satisfied them.

Going forward: mark a ticket `complete` (or an issue `resolved`) in the same commit as the code change, per the storybloq skill's own discipline. Also — before starting new work, verify the top of the recommend list against `git log --oneline` for the merged PRs it might already reflect.

## Remaining backlog

Open:
- **T-002** (screen-reader audit) — needs a real VoiceOver/NVDA session.
- **T-003** (fallback catalog for non-Google fonts) — feature, product-design work.
- **T-004** (non-latin subset support) — feature.
- **T-005** (custom font drop-in file input) — feature.
- **ISS-001** (weight-warning row when family is ambiguous) — small UX.
- **ISS-002** (show final embedded size next to font weight) — small UX.

Natural next threads: **T-002** if a real device is available; otherwise **ISS-002** as the smallest well-scoped item, or **T-003** if you want to open the font-resolver work.

## Files touched

Code: `index.html`, `src/style.css`, `src/lib/parseSvg.test.js` (new), `src/lib/fetchFont.test.js` (new), `.github/workflows/ci.yml` (new), `package.json`, `package-lock.json`, `.gitignore`.

Ledger: 12 storybloq JSON records (7 issues + 5 tickets) reconciled to match on-disk truth.

No open working-tree changes as of this handover.
