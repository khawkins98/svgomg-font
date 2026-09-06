# Project Rules

Hard-won constraints for svgomg-font. Break these and things fail silently.

## SVGO configuration

- **Never enable `inlineStyles`** on font-embedded SVGs. It moves `<style>`
  rules onto elements and silently drops `@font-face` blocks (they don't apply
  to any element). Configure it off in `src/lib/optimize.js`.
- **Never enable `minifyStyles`** on the same output. CSSO mangles the base64
  payloads inside `data:` URIs in some versions. Off in `optimize.js`.

## Font fetching and matching

- **Validate WOFF2 magic bytes** (`77 4F 46 32` / ASCII `wOF2`) on every fetch
  result. A 404 HTML page base64-encoded into a `data:` URI fails silently in
  the browser — cheap to catch here.
- **Match local fonts by `.postscriptName` first**, `.family` second. SVG
  editors embed the PostScript name in `font-family` (e.g. `MarkerFelt-Wide`),
  which won't match `.family: "Marker Felt"`.
- **Strip PSMT / MT / PS suffixes** from name tokens before the weight-keyword
  lookup, or `BoldMT` won't be recognised as bold (weight 700).

## Regex boundaries

- The `font-family` extractor's negated character set MUST include `{}`.
  Without it, minified CSS like `.l{font-family:Roboto-Bold}.m{...}` gets
  captured as one giant "family name" through the rule boundary. No valid
  font name contains braces.

## Bundle discipline

- Load `fontkit` via dynamic `import('fontkit')` inside `subsetFontIfPossible()`,
  not at module parse time. It is ~390 KB and only needed when subsetting
  runs — top-level import puts it in the main chunk and doubles first paint.
- Prefer named imports (`import { create } from 'fontkit'`). Default import
  fails because fontkit has no default export.

## Preview isolation

- The "before" pane must NOT inherit the document's `@font-face` rules. It
  exists to show what the raw SVG looks like without our embedding pass, so
  bleeding fonts through defeats its purpose. Render it in an isolated
  context (iframe, shadow DOM, or scoped `@font-face` reset).
