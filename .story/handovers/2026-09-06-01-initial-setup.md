# Initial setup

Storybloq was initialized on an existing, shipping project. This handover captures the decisions made during setup so the reasoning survives.

## Project shape

- **svgomg-font** — client-side browser tool for embedding referenced web fonts into SVGs as base64 WOFF2, with optional SVGO pass.
- **Stack:** Vite + vanilla JS · SVGO · fontkit · Fontsource via jsDelivr.
- **Shape:** static site, no backend, no data, no auth.
- **Deploy:** GitHub Pages (currently manual — see T-008).
- **Language:** JavaScript (ES modules). No TypeScript.

## Gates answered during setup

- **Surface:** Web tool. Not asked — inferred from the vite + index.html + gh-pages URL.
- **Traits:** None (not AI, not realtime, not marketplace, not content CMS).
- **Stack:** Confirmed from `package.json` — Vite 5, fontkit 2, svgo 3.
- **System shape:** Static frontend, no backend. Not asked — clear from repo.
- **Auth:** N/A. Everything runs in the user's browser.
- **Sensitive domain:** No.
- **Quality checks:** Minimal for now (build + commit). No test suite exists yet; will move to Tests-only once T-006 lands.

## Phase structure

Five phases, four of them representing already-shipped work (captured retroactively so the roadmap reflects reality, not just future work):

- p0 `core-pipeline` — original ship. Complete.
- p1 `font-resolution` — local fonts, PostScript matching, fontkit subsetting. Complete.
- p2 `ux-polish` — dropzone, drag, copy, samples, HUD. Complete.
- p3 `a11y-and-preview` — active. Preview isolation fix is in flight on `fix/before-preview-font-isolation` (T-001, marked inprogress).
- p4 `ship-hardening` — planned. Coverage extensions, tests, CI, deploy automation.

Phases were left with default status (`open`) rather than marked `complete`, per the setup-flow guidance: don't infer completion from git history alone. If the user confirms the pre-p3 phases are done, we can mark them complete in one pass.

## Tickets

Eight seeded (T-001 through T-008). One dependency wired: T-007 (CI) blocked by T-006 (tests). T-001 is `inprogress` because it matches the current branch.

## Issues

Three low-severity issues seeded (ISS-001..003), all surfaced from LEARNINGS.md or current git state:
- Ambiguous family names silently default to weight 400.
- Final embedded size not shown in UI.
- Untracked `scripts/generate-demo-comparison.mjs` on current branch.

## RULES.md

Written new. Captures the non-obvious constraints from LEARNINGS.md that would burn a future contributor:
- SVGO `inlineStyles` / `minifyStyles` must stay off.
- WOFF2 magic-byte validation on every fetch.
- Match local fonts by `.postscriptName`, not `.family`.
- Strip `PSMT`/`MT`/`PS` before weight-keyword lookup.
- font-family regex must exclude `{}` (rule-boundary bug).
- fontkit is dynamic-imported for bundle discipline.
- Before-pane preview must not inherit document @font-face.

## Files written

- `.story/` (init) — config, roadmap, tickets, issues, handovers, notes, lessons, snapshots dirs.
- `RULES.md` — 2013 bytes.
- `.gitignore` — appended three `.story/` entries (snapshots, sessions, status.json).

## Not written

- No CLAUDE.md. README and ABOUT.md already cover project purpose and LEARNINGS.md carries the deep context. Adding a CLAUDE.md would duplicate rather than clarify.

## Next likely work

- Finish T-001: verify preview isolation, merge to main.
- ISS-003: decide whether the demo-comparison script gets committed.
- T-006 (tests) unlocks T-007 (CI) — that pair is the highest-leverage next block.
