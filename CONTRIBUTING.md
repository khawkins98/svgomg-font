# Contributing

Thanks for thinking about contributing. This project is small on purpose — the
goal is one tool that does one thing well. PRs are welcome; please keep them
focused.

## Local setup

Use Node.js 24 and npm for the locked toolchain.

```bash
git clone https://github.com/khawkins98/svgomg-font.git
cd svgomg-font
npm ci
npm run dev
```

Open <http://localhost:5180/svgomg-font/> (or the URL Vite prints if the port
is occupied). Vite hot-reloads on save. Stop it with Ctrl+C. The app lives in
`src/` and `index.html`.

For a one-command start from a checkout, `npm start` runs `scripts/launch.mjs`:
it installs dependencies with `npm install` only when `node_modules/` is absent,
then starts Vite. Use `npm ci` when you need to restore dependencies from the lockfile.
Both install commands run `prepare`, which configures the commit-message hook in
[`.githooks/commit-msg`](.githooks/commit-msg).

## Checks

Run the same checks listed in [CI](.github/workflows/ci.yml):

```bash
npm run lint
npm test
npm run build
```

`npm test` runs Vitest once; `npm run test:watch` watches during development.
Tests cover parsing, font-name resolution with mocked fetches, and codepoint
extraction. They do not establish browser rendering, installed-font permissions,
CDN availability, or email-client compatibility.

`npm run build` writes the static app to `dist/`. Run `npm run preview` and open
the printed URL under `/svgomg-font/` to inspect that build; stop with Ctrl+C.
The [Vite configuration](vite.config.js) sets the base path. The
[deployment workflow](.github/workflows/deploy.yml) publishes `dist/` to GitHub
Pages on pushes to `main`; Markdown guides are read in the repository.

Read [RULES.md](RULES.md) before changing the pipeline. For font-related changes,
compare relevant [samples](public/samples/), inspect the report for missing faces,
and test the downloaded SVG in its intended consuming context.

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
- Improvements to the existing fontkit subsetting and character coverage
- Better SVGO defaults that don't break embedded fonts
- More sample SVGs that exercise edge cases

## What's out of scope

- Hosting fonts ourselves. We pull from Fontsource on demand.
- A backend. The whole point is client-side.
- Editor features (path editing, recoloring). Use Inkscape/Illustrator/Figma.

## Documentation maintenance

Keep the [README](README.md) focused on first use, options, material limitations,
and routes to more detail. Maintain pipeline explanation in [ABOUT.md](ABOUT.md),
local setup and checks here, and implementation constraints in [RULES.md](RULES.md).
Agent guidance should link to those homes instead of repeating their instructions
or rolling test counts.

Check instructions against `index.html`, `src/main.js`, the library modules,
`package.json`, and the workflows before changing claims. In particular, check
actual UI labels, automatic reprocessing, fallback behavior, and output formats.
[LEARNINGS.md](LEARNINGS.md), [CHANGELOG.md](CHANGELOG.md), and `.story/` preserve
research and delivery history; earlier observations are not current usage promises.
Keep their recorded conditions and outcomes intact, using a superseding note or
navigation link when needed.
