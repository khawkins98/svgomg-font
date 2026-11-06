# About SVGOMG-Font

## The problem

You designed an SVG with text in Roboto, Inter, Open Sans, or another font.
It looks right in your editor, but another machine reflows the text or falls
back to a different face. The file references the font's *name*, without
carrying the font itself.

SVGOMG-Font embeds font data in the SVG's `<style>` block. This removes the
need for an external font request — useful for SVGs used as `<img>` or CSS
backgrounds, where external resources are blocked. The viewer must still
support SVG and embedded fonts; embedding does not guarantee email-client
or editor compatibility.

For the complete upload-to-download path, options, and adoption limits, see
[Usage](README.md#usage) and [Limitations](README.md#limitations).

## What it does, step by step

1. **Parse.** Finds non-generic `font-family` names in SVG attributes, inline
   styles, and `<style>` blocks. This is regex-based extraction, not a full CSS
   cascade or external-stylesheet resolver.
2. **Strip.** Removes deprecated SVG `<font>` blocks when **Strip `<font>`** is
   enabled. They are separate from modern `@font-face` rules.
3. **Resolve.** Infers weight and italic style from family-name suffixes and
   requests a static-weight Latin WOFF2 from Fontsource via jsDelivr, trying
   Latin Extended if the first request fails. It validates WOFF2 magic bytes
   before embedding. A family name without a weight suffix defaults to 400;
   separate CSS weight declarations do not drive the CDN request.
4. **Fill missing faces.** For families not resolved by the CDN, tries the Local
   Font Access API if available and permitted. Matching uses PostScript and
   family names, then prefers matching weight/style. The UI also offers font
   file uploads for those faces. Review the selected face: local matching can
   fall back to another weight/style. Font embedding rights remain your responsibility.
5. **Subset.** With **Subset glyphs** enabled, fontkit keeps characters found
   in `text`, `tspan`, `textPath`, `title`, and `desc`, plus Basic Latin
   (U+0020–U+007E). It emits a TrueType/sfnt subset and uses it only if smaller;
   failures retain the original font. It cannot add glyphs absent from the input font.
6. **Embed.** Prepends `@font-face` rules with base64 `data:` URIs to an existing
   `<style>` block, or creates one. The MIME type and CSS format reflect the
   font data: output is not always WOFF2.
7. **Optionally optimize.** Runs SVGO with `inlineStyles` and `minifyStyles`
   disabled to protect embedded font rules. See [RULES.md](RULES.md) before
   changing these defaults.

Input files are read and processed in the browser; they are not uploaded.
Fontsource lookup makes CDN requests containing the derived font name, weight,
and style. Installed fonts require permission, and font files supplied through
**Upload font** are read locally. Downloaded SVGs contain the embedded font data.

## Why embedding instead of outlining?

Outlining converts glyphs into paths. Embedding leaves the original `<text>`
nodes in place, so the content remains available for editing, searching, and
assistive technology where the consuming context supports it. An `<img>` still
needs appropriate alternative text in the page that uses it.

Size depends on the font, text, and output format. Repeated text can benefit
from sharing one embedded subset, while a short label may be smaller as paths.
Base64 adds roughly one third to the binary font size. Use the report's embedded
payload and final SVG byte count rather than assuming embedding always wins.

This tool does not convert text to paths or reconstruct text that was already
outlined. Its job is to carry fonts alongside live SVG text.

## Background and credits

The companion [SVGOMG](https://jakearchibald.github.io/svgomg/) provides browser
SVG optimization. SVGOMG-Font adds font resolution and embedding, using
[Fontsource](https://fontsource.org/) via [jsDelivr](https://www.jsdelivr.com/),
[fontkit](https://github.com/foliojs/fontkit), and [SVGO](https://svgo.dev/).
The app layout is inspired by [Squoosh](https://squoosh.app/).

[LEARNINGS.md](LEARNINGS.md) records the original tool survey, failed subsetting
experiments, and implementation discoveries. Those records explain how the
project got here; the current workflow is maintained in the README and this page.
