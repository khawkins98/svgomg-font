# About SVGOMG-Font

## The 30-second pitch

You designed an SVG with text in some web font — Roboto, Inter, Open Sans,
whatever. It looks great in your editor. You ship it. On a machine without
that font, the text reflows or falls back to another face. Sometimes it
doesn't even appear. That's because the font wasn't actually embedded;
only its *name* was.

SVGOMG-Font fixes that by embedding font binaries directly in the SVG's
`<style>` block. The font travels with the image, including in a browser's
`<img src="...">` context. The app can fetch fonts from Fontsource via
jsDelivr, read permitted installed fonts, or accept font files you supply.

For the current workflow, options, and limits, use the
[README](README.md#usage). Font embedding and redistribution still need to
be permitted by the font's license.

## What it does, step by step

1. **Parse.** Find font-family references in SVG attributes and CSS.
2. **Strip junk.** Optionally remove deprecated SVG `<font>` blocks.
3. **Resolve.** Look up fonts on Fontsource, then try installed fonts where
   browser support and permission allow. Offer uploads for unresolved faces.
4. **Subset and embed.** Attempt glyph subsetting when enabled, then insert
   `@font-face` data URIs while retaining the SVG's text nodes.
5. **Optionally optimize.** Run SVGO with the font-sensitive plugins disabled.

The [source map](CLAUDE.md#where-the-important-stuff-lives) points to each
stage; [RULES.md](RULES.md) holds its implementation constraints.

## What it does *not* do

It does not turn text into outlines, edit paths, or replace a design tool.
Keeping text nodes preserves editability and machine-readable content; it
doesn't guarantee every viewer will support SVG fonts. For resolution,
character coverage, and output-format limits, see
[README limitations](README.md#limitations).

## Why this gap exists

The following comparison is retained from the project's original research,
not a current survey of these tools. See [LEARNINGS.md](LEARNINGS.md) for
the recorded investigation:

- **SVGO / SVGOMG** — optimization, no font handling
- **Vecta Nano** — claims font embedding, ships the deprecated `<font>`
  format
- **Transfonter** — generates `@font-face` CSS from uploaded fonts, no SVG
- **svg-buddy** (Java) and **svg-embed-font** (Go) — full pipeline, but
  CLI-only and require their respective runtimes installed

This project is the small SPA in the middle: paste in an SVG, get one back
that works.
