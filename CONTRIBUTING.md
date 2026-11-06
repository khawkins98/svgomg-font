# Contributing

Thanks for thinking about contributing. This project is small on purpose — the
goal is one tool that does one thing well. PRs are welcome; please keep them
focused.

## Local setup

Use Node.js 24 and npm. From the repository root:

```bash
npm ci
npm run dev
```

Open <http://localhost:5180/svgomg-font/>. Vite hot-reloads on save; keep the
server running while you use it. The app lives in `src/` and `index.html`.
`npm start` installs dependencies if missing and starts Vite as an alternative.

In another terminal:

```sh
npm run lint
npm test
npm run build
```

The build writes `dist/`. Use `npm run preview` to serve it and open
`/svgomg-font/` on the printed origin. GitHub Pages deploys `dist/`; Markdown
guides stay in the source repository. `npm ci` also configures the project's
commit-message hook through `prepare`.

Read [RULES.md](RULES.md) before implementation changes. Keep the SVGO font-safe
settings and preview isolation intact. [LEARNINGS.md](LEARNINGS.md) records why.

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
- Improvements to the existing glyph-subsetting path
- Better SVGO defaults that don't break embedded fonts
- More sample SVGs that exercise edge cases

## What's out of scope

- Hosting fonts ourselves. We pull from Fontsource on demand.
- A backend. The whole point is client-side.
- Editor features (path editing, recoloring). Use Inkscape/Illustrator/Figma.

## Documentation maintenance

Keep first use, export and font-resolution limits in README; maintain the
pipeline explanation in [ABOUT.md](ABOUT.md) and commands here. Check instructions
against the current UI, including automatic processing and missing-face rows.
Preserve clear product copy and the dated changelog, research and handover records.
Record user-visible changes under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
