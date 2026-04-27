# Learnings

A running log of things discovered while building this. Written so the
next person (or future-us) doesn't have to repeat the research.

---

## SVG `<font>` glyph blocks are dead

The `<font>` / `<glyph>` element family inside SVG is a deprecated way of
embedding outline data directly. **No modern browser renders it.** It was
removed from Chromium years ago and was never well-supported elsewhere.

Several editors still emit these blocks when you ask them to "embed
fonts" — including [Vecta Nano](https://vecta.io/nano), which produces
SVGs with `xmlns:v="https://vecta.io/nano"` in the root. Files coming
from those tools look fine in the editor (which renders the SVG fonts
itself) and broken everywhere else.

The fix: strip the blocks and replace them with `@font-face` rules that
reference real woff2 files via `data:` URIs.

## SVGs in `<img>` tags can't load external resources

When an SVG is embedded inline (`<svg>...</svg>` in HTML), browsers will
honor external `<link>` stylesheets, fetch fonts from `@font-face` URLs,
etc. When the same SVG is used as `<img src="file.svg">` (or referenced
via CSS `background-image: url(file.svg)`), browsers run it in a
sandboxed context that blocks all external resource loads as a security
measure.

So `@import url('https://fonts.googleapis.com/css2?...')` inside the
SVG's `<style>` works for inline use but silently fails for `<img>` use.
The only way to make a single SVG file render correctly in *all*
contexts is to inline the font as a `data:` URI. That's the entire
reason this tool exists.

## Google Fonts is now serving variable fonts for popular families

Hitting `https://fonts.googleapis.com/css2?family=Roboto:wght@400;700` with
a modern Mac/Safari User-Agent returns:

```css
@font-face { font-family: 'Roboto'; font-weight: 400; src: url(.../KFO7Cn...azQ.woff2) ... }
@font-face { font-family: 'Roboto'; font-weight: 700; src: url(.../KFO7Cn...azQ.woff2) ... }
```

The `src` URLs for 400 and 700 are **identical**. That's because Google now
serves Roboto as a single variable font, and the browser uses CSS to pick
weights from the variable axis at render time.

That's fine if you control the consuming CSS, but in our case we're
embedding fonts to support whatever class names the original SVG already
uses (e.g. `font-family: Roboto-Bold`). If we map both `Roboto-Regular` and
`Roboto-Bold` to the same variable font with the same default weight,
they'll render identically — Bold ends up looking like Regular.

The workaround is to fetch from a source that publishes static-weight
files instead. We use [Fontsource](https://fontsource.org/) via jsDelivr:

```
https://cdn.jsdelivr.net/npm/@fontsource/<slug>/files/<slug>-latin-<weight>-normal.woff2
```

Predictable URL, predictable static-weight file. No User-Agent dance.

## woff2 magic bytes

Useful sanity check after fetching: a real woff2 file starts with the bytes
`77 4F 46 32` (ASCII "wOF2"). If you fetch a 404 page and don't notice, you
end up base64-encoding HTML and embedding it in the SVG, which fails
silently. Cheap to validate.

## SVGO's `inlineStyles` and `minifyStyles` corrupt embedded fonts

Out of the box, SVGO's default preset will:

- `inlineStyles` — move `<style>` rules onto the elements they apply to,
  which silently drops `@font-face` rules entirely (they don't apply to
  any element).
- `minifyStyles` — runs CSSO over the styles, which mangles the base64
  inside `data:` URIs in some versions.

Both need to be disabled in the SVGO config when you're optimizing a
font-embedded SVG. We do this in `src/lib/optimize.js`.

## Latin subset full-font sizes

Approximate woff2 sizes for the latin subset (the only one most files
need), via Fontsource:

| Family       | Regular (400) | Bold (700) |
| ------------ | ------------- | ---------- |
| Roboto       | ~22 KB        | ~22 KB     |
| Inter        | ~30 KB        | ~30 KB     |
| Open Sans    | ~22 KB        | ~22 KB     |
| Lato         | ~25 KB        | ~25 KB     |

Base64 inflates by roughly 4/3, so a typical "Regular + Bold" embed adds
~60 KB to the SVG. Glyph subsetting (only the characters actually used)
typically shrinks that 5–10× — worthwhile follow-up.

## What other tools exist (and why they don't fit)

Surveyed during research, in case future-us forgets:

| Tool             | What it does                               | Why we still built this        |
| ---------------- | ------------------------------------------ | ------------------------------ |
| SVGOMG           | Browser SVGO frontend, optimize only       | Doesn't touch fonts            |
| Vecta Nano       | Browser tool, optimize + "embed" fonts     | "Embed" = deprecated `<font>`  |
| Transfonter      | Browser, generates @font-face CSS          | Doesn't touch SVG              |
| eeencode         | Browser, base64-encode whole SVG           | Different problem (data URIs)  |
| svg-buddy        | Java CLI, full pipeline                    | Needs JRE                      |
| svg-embed-font   | Go CLI, finds local fonts and base64s      | Needs Go binary, local fonts   |
| woff2base64      | Node lib, generates @font-face CSS         | Just a building block          |
| fontoptim        | Node lib, generates @font-face CSS         | Just a building block          |

## Local Font Access API exists but is narrow

`window.queryLocalFonts()` lets a web page enumerate the user's installed
fonts and read TTF data. It's:

- Chromium-only at time of writing
- Requires a permission prompt
- Returns TTF, not woff2 — you'd need to convert in-browser via wasm
  (e.g. `wawoff2`) before embedding

Could be a "use what's installed" mode later, but the Fontsource path
covers 95% of real-world cases without the permission friction.

## Conventional Commits + small repos

Even tiny repos benefit from a stated commit convention from day one. It
costs nothing to follow and makes `git log` readable; retrofitting it
later is a slog. We've documented it in `CONTRIBUTING.md`.
