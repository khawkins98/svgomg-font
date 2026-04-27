# About SVGOMG-Font

## The 30-second pitch

You designed an SVG with text in some web font — Roboto, Inter, Open Sans,
whatever. It looks great in your editor. You ship it. On half the machines
that open it, the text reflows or falls back to Times. Sometimes it doesn't
even appear. That's because the font wasn't actually embedded; only its
*name* was.

SVGOMG-Font fixes that. Drop in the SVG, it pulls the right woff2 files from
Fontsource (a clean static mirror of Google Fonts) and inlines them as base64
inside the SVG's `<style>` block. The output is a self-contained file that
renders the same everywhere — including when used as `<img src="...">`, which
is where most "broken text" reports come from.

## What it does, step by step

1. **Parse.** Walks the SVG looking for every distinct `font-family`, in
   `<style>` blocks and on individual elements.
2. **Strip junk.** Removes deprecated SVG `<font>` glyph blocks if present.
   These are an old format some editors (Vecta Nano, older Inkscape) still
   emit, and no browser since IE 9 actually renders them. They're inert
   bytes that bloat the file.
3. **Resolve.** For each family, infers the weight from the suffix
   (`Roboto-Bold` → 700, `Open Sans Light` → 300) and fetches the matching
   latin-subset woff2 from Fontsource via jsDelivr.
4. **Embed.** Adds an `@font-face` rule with a `data:font/woff2;base64,...`
   URI for each font, prepended to the SVG's existing `<style>` block.
5. **Optionally optimize.** Runs SVGO with safe defaults — `inlineStyles`
   and `minifyStyles` are disabled because they'd corrupt the base64 we
   just inlined.

## What it does *not* do

- Subset glyphs. The latin woff2 files are ~20–30 KB each. A glyph subset of
  only the characters actually used in the SVG would shrink that 5–10×, but
  doing that in the browser needs a wasm subsetter, and we wanted a small
  V1.
- Resolve custom or paid fonts. Fontsource only mirrors Google Fonts'
  catalog. If you're using something else, you'd extend
  `src/lib/fetchFont.js` with another resolver, or hand-paste an
  `@font-face` block.
- Outline text to paths. Outlining loses semantics (selectable text,
  accessibility, screen readers, copy-paste) and bloats the file. Use
  Illustrator's "Create Outlines" if you want that — the whole point of
  this tool is the opposite.

## Why this gap exists

There are good tools at every step of the pipeline, but none that do all
three together in a browser:

- **SVGO / SVGOMG** — optimization, no font handling
- **Vecta Nano** — claims font embedding, ships the deprecated `<font>`
  format
- **Transfonter** — generates `@font-face` CSS from uploaded fonts, no SVG
- **svg-buddy** (Java) and **svg-embed-font** (Go) — full pipeline, but
  CLI-only and require their respective runtimes installed

This project is the small SPA in the middle: paste in an SVG, get one back
that works.
