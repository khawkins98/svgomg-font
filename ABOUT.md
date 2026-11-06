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

## How a font reaches the output

1. **Find the font names.** The parser reads `font-family` declarations from
   style blocks and element attributes. When enabled, it strips deprecated
   SVG `<font>` blocks.
2. **Try Fontsource.** The resolver infers weight and style from family-name
   suffixes, then requests a WOFF2 from jsDelivr. It tries Latin before Latin
   Extended and checks the font signature before embedding.
3. **Resolve missing faces.** For fonts absent from Fontsource, the app can try
   the browser's Local Font Access API. If detection is unavailable, denied or
   finds no match, use **Upload font** or drop a file onto that face's row.
   WOFF2, WOFF, TTF and OTF files are accepted. The local path matches PostScript
   names before family names. Detection requires browser support and permission;
   the file-input path is the alternative. Use fonts you may redistribute.
4. **Subset when useful.** With **Subset glyphs** enabled, fontkit keeps glyphs
   for text-bearing SVG elements plus Basic Latin. A smaller subset is embedded
   as TrueType; otherwise the original font and format are retained. Fonts read
   through local detection are also embedded as TrueType. Output is therefore
   not always WOFF2. A subset cannot supply glyphs for arbitrary later text edits.
5. **Embed and optimize.** The app inserts `@font-face` rules with base64 data
   URIs into a style block. The optional SVGO pass disables `inlineStyles` and
   `minifyStyles` to protect those rules. If optimization fails, the report says
   so and the processed SVG remains available.

The report distinguishes resolved and missing faces and shows embedded payload
sizes. A successful download does not mean every font resolved. Your browser can
use an installed font in the preview, masking a missing embed; check the warnings
and the downloaded file in its intended destination.

## Why keep text instead of outlining?

Embedding keeps real `<text>` nodes available for editing and text extraction.
Outlining converts them into paths. File-size savings depend on the text, font
and subset; there is no fixed reduction ratio. Accessibility also depends on the
SVG markup and how the destination presents it, not just whether a font embeds.

The [README](README.md#fix-an-svg) gives the complete processing/export path.
[LEARNINGS.md](LEARNINGS.md) preserves the original research, alternatives and
failed approaches; [RULES.md](RULES.md) records the implementation constraints.

## Credits

The tool is a companion to [SVGOMG](https://jakearchibald.github.io/svgomg/).
Fonts come from [Fontsource](https://fontsource.org/) via
[jsDelivr](https://www.jsdelivr.com/); [fontkit](https://github.com/foliojs/fontkit)
handles subsetting and [SVGO](https://svgo.dev/) handles optimization. The
[interface footer](index.html) also credits [Squoosh](https://squoosh.app/) for
layout inspiration. Original project licence: [MIT](LICENSE).
