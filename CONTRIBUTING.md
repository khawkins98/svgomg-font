# Contributing

Thanks for thinking about contributing. This project is small on purpose — the
goal is one tool that does one thing well. PRs are welcome; please keep them
focused.

## Local setup

Use Node.js **24.x** and npm with the current locked toolchain.

```bash
git clone https://github.com/khawkins98/svgomg-font.git
cd svgomg-font
npm ci
npm run dev
```

Open `http://localhost:5180/svgomg-font/` (or the URL Vite prints if the port
is occupied). Vite hot-reloads on save. The app lives in `src/` and
`index.html`; [README usage](README.md#usage) walks through a sample.
Stop the server with Ctrl+C.

Alternatively, `npm start` runs `scripts/launch.mjs`: it runs `npm install`
only if `node_modules/` is absent, then starts Vite. Use `npm ci` when you
need a clean install from the lockfile.

The install's `prepare` script enables `.githooks/commit-msg`, which rejects
AI-attribution trailers; see [the hook](.githooks/commit-msg) for exact patterns.

## Checks before a pull request

```bash
npm run lint
npm test
npm run build
```

`npm run test:watch` runs Vitest while you edit. Tests cover SVG parsing,
font-name/response handling with mocked fetches, and codepoint extraction;
they don't establish browser rendering or live CDN availability.

For a production smoke check, run `npm run preview` after the build and open
the printed `/svgomg-font/` URL. The static output is in `dist/` with the
`/svgomg-font/` base configured in `vite.config.js`; preview is local only.
Try a sample, inspect missing-font and weight warnings, then download and
open the result in its intended context.

[CI](.github/workflows/ci.yml) runs lint, tests, and build on PRs to `main`
and non-`main` pushes. Both workflows currently select Node 20, while the
locked Vitest 5 requires Node 22.12+ (and ESLint 10 needs 22.13+ on Node 22).
Use Node 24 locally; aligning the workflows is a separate tooling change.
[Deployment](.github/workflows/deploy.yml) builds and publishes to GitHub
Pages on pushes to `main` or manual dispatch.

Read [RULES.md](RULES.md) before changing the pipeline and use
[LEARNINGS.md](LEARNINGS.md) for recorded design context and experiments.

## Branching

- `main` is always deployable.
- Branch off `main` for any change:
  - `feat/<short-name>` for new features
  - `fix/<short-name>` for bug fixes
  - `chore/<short-name>` for tooling, docs, deps
  - `refactor/<short-name>` for non-behavior-changing rewrites

## Commits — Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) so the
history reads cleanly and a changelog could be generated later.

```
<type>(<optional scope>): <short summary>

<optional body explaining why>
<optional footer e.g. BREAKING CHANGE: ..., Fixes #123>
```

Types we use:

- **feat** — a user-visible new capability
- **fix** — a bug fix
- **chore** — tooling, deps, repo housekeeping
- **docs** — documentation only
- **refactor** — code change that doesn't add a feature or fix a bug
- **perf** — performance improvement
- **test** — adding or updating tests
- **style** — formatting, whitespace (no code change)

Examples:

```
feat(fetchFont): support italic variants from Fontsource
fix(parseSvg): handle font-family without surrounding quotes
chore(deps): bump vite to 5.4
docs(readme): document the SVGO safe-defaults
```

Keep the subject under 72 characters and in the imperative ("add x", not "added
x"). If the change is non-obvious, explain *why* in the body — the diff already
shows what.

## Pull requests

- One topic per PR. If you find yourself writing "and also..." in the
  description, split it.
- Title follows the same Conventional Commits format as the commit.
- Describe what changed and, if it isn't obvious, why.
- Include before/after screenshots for any UI change.
- If you touched font resolution, list which sample SVGs you tested with.

## What's in scope

- Better font resolution (more sources, smarter family-name parsing)
- Improvements to existing glyph subsetting and non-latin font coverage
- Better SVGO defaults that don't break embedded fonts
- More sample SVGs that exercise edge cases

## What's out of scope

- Hosting fonts ourselves. We pull from Fontsource on demand.
- A backend. The whole point is client-side.
- Editor features (path editing, recoloring). Use Inkscape/Illustrator/Figma.

## Maintaining documentation

Keep user steps, options, and adoption limits in [README.md](README.md);
setup and checks belong here. [ABOUT.md](ABOUT.md) explains the motivation,
and [CLAUDE.md](CLAUDE.md) routes agents to code and project rules. Verify
changed claims against the UI, source, scripts, and workflows rather than
copying implementation summaries into every page. Treat the changelog,
learnings, and `.story/` records as history; preserve recorded conditions
and outcomes when current guidance changes.
