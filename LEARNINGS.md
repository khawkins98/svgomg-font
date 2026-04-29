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

We've now implemented this as the primary "missing font" resolution path.
When the user drops an SVG with unrecognised fonts, the tool queries local
fonts once, caches them in `userFonts`, and converts them on the fly.

## `queryLocalFonts()` exposes `.postscriptName` — use it

Each `FontData` entry from `queryLocalFonts()` has four key fields:

| Field            | Example value         |
| ---------------- | --------------------- |
| `.family`        | `"Marker Felt"`       |
| `.style`         | `"Wide"`              |
| `.fullName`      | `"Marker Felt Wide"`  |
| `.postscriptName`| `"MarkerFelt-Wide"`   |

SVG editors almost always embed the **PostScript name** in `font-family`
(e.g. `font-family="MarkerFelt-Wide"`). The natural matching field is
therefore `.postscriptName`, not `.family`. Matching only against `.family`
means `"MarkerFelt-Wide"` never resolves to `"Marker Felt"`. Check
`.postscriptName` first; fall back to `.family` for fonts that use plain
human-readable names.

## PostScript name suffixes in font family names

macOS and Adobe apps append suffixes to PostScript names that are not
weight keywords:

| Suffix | Meaning                        | Example                 |
| ------ | ------------------------------ | ----------------------- |
| `PSMT` | PostScript Metric              | `CourierNewPSMT`        |
| `MT`   | Metric / Monotype (on a weight)| `BoldMT` → weight 700   |
| `PS`   | PostScript                     | `CourierNewPS`          |

When parsing weight from a name token, strip these suffixes before the
weight-keyword lookup, otherwise `"BoldMT"` isn't recognised as bold.
When normalising a family name for display/matching, strip them and split
CamelCase so `"CourierNewPSMT"` → `"Courier New"`.

## CSS `background` vs SVG `fill` at seam boundaries

When a `<svg>` element carries `background: #color` via CSS *and* contains
a path with the same `fill`, browsers render them through different engines.
Sub-pixel anti-aliasing differences produce a 1 px bleed line at the seam
between adjacent `background` and `fill` regions (visible as a thin dark
line or gap, especially where SVG waves meet a page section).

Fix: don't use CSS `background` on the SVG element. Instead, add a
`<rect width="100%" height="100%" fill="#color"/>` as the first child —
both the rect and the path are now rendered by the same SVG compositor,
eliminating the seam.

## CSS `d: path()` for animating SVG path shapes

You can morph an SVG path purely in CSS using keyframes on the `d`
property:

```css
@keyframes wave-bob {
  0%   { d: path("M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"); }
  50%  { d: path("M0,20 C360,60 1080,20 1440,40 L1440,80 L0,80 Z"); }
  100% { d: path("M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"); }
}
.wave-path { animation: wave-bob 7s ease-in-out infinite; }
```

Keep the bottom rectangle (`L1440,N L0,N Z`) identical in every keyframe
or the wave bottom will drift and create gaps. Supported Chrome 88+,
Firefox 72+, Safari 16.4+. Pair with `@media (prefers-reduced-motion: reduce)`
to disable for users who've opted out.

## SVG `<text>` + `<tspan>` for mixed-colour text

Positioning two separate `<text>` elements at guessed `x` coordinates always
produces a visual gap — SVG text doesn't flow. Use one `<text>` with two
`<tspan>` children instead; inline `<tspan>` elements flow naturally and
require no x coordinate for the second span:

```svg
<!-- ❌ gap-prone -->
<text x="66" fill="white">SVGOMG</text>
<text x="330" fill="#a78bfa">-Font</text>

<!-- ✅ gapless -->
<text x="66">
  <tspan fill="white">SVGOMG</tspan><tspan fill="#a78bfa">-Font</tspan>
</text>
```

## A loose regex eats minified CSS for breakfast

First cut of the `font-family` extractor used:

```js
/font-family\s*[:=]\s*(["']?)([^;"'<>]+)\1/g
```

Against compact CSS like:

```css
.l{font-family:Roboto-Bold}.m{font-family:Roboto-Regular}.n{fill:#2d2d2d}
```

…that captures `Roboto-Bold}.m{font-family:Roboto-Regular` as a single
"family name." Looks fine when families are well-spaced or in attributes;
falls apart on the kind of compact output Vecta Nano / Illustrator emit.

Fix is one character: add `{}` to the negated set so capture stops at
rule boundaries. Worth always doing — there's no valid font name with
braces in it.

## Conventional Commits + small repos

Even tiny repos benefit from a stated commit convention from day one. It
costs nothing to follow and makes `git log` readable; retrofitting it
later is a slog. We've documented it in `CONTRIBUTING.md`.

## wawoff2 + HarfBuzz subsetting hangs in Vite browser bundles

The original subsetting pipeline was: fetch font → decompress woff2 via
`wawoff2` → subset with `harfbuzzjs` → re-compress with `wawoff2`.

This worked in Node.js but **hung silently in Vite browser bundles**.

Root cause: `wawoff2/decompress.js` is an Emscripten-generated module. It
attaches a callback via `em_module.onRuntimeInitialized = resolve` and
waits for that Promise. In Node.js the Emscripten WASM initialises in a
later microtask tick, so `resolve` is assigned before the callback fires.
In Vite's CJS→ESM transform the module evaluates synchronously during
import, fires `onRuntimeInitialized` *before* the Promise constructor
runs, and the callback is lost — `resolve` is never called, so
`await runtimeInit` waits forever and the whole processing pipeline stalls.

Two replacements were tried:

- **`subset-font`** — calls `fs.readFile()` to load `hb-subset.wasm` from
  disk. Node.js-only; fails at runtime in a browser bundle even if `fs` is
  externalised.

- **`fontkit`** (v2 `browser-module.mjs`) — browser-native, handles TTF,
  OTF, WOFF, and WOFF2 as input, exposes a `createSubset()` API, zero WASM.
  Chosen as the replacement.

Two gotchas discovered during the fontkit migration:

1. **Named exports only** — `import fontkit from 'fontkit'` fails with
   "default is not exported". Use `import { create } from 'fontkit'`.

2. **Output is always TTF/sfnt**, not woff2. CSS `format()` hint must be
   `truetype`, MIME type `font/truetype`. Still valid for SVG `@font-face`.

Bundle size dropped from ~1.4 MB to ~395 KB (main chunk) after removing
`harfbuzzjs`, `wawoff2`, and `subset-font`.

fontkit is ~390 KB and only needed when subsetting runs, so it is
loaded via a dynamic `import('fontkit')` inside `subsetFontIfPossible()`
rather than at module parse time — keeping the initial page load lean.
