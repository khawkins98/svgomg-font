# SVGOMG-Font

Drop in an SVG, get back the same SVG with its web fonts inlined as base64
woff2 — so the text actually renders when the file is used as an `<img>`,
emailed around, or hosted somewhere the original font isn't installed.
Optional [SVGO](https://svgo.dev/) pass strips the editor cruft on the way out.

Plays on [SVGOMG](https://jakearchibald.github.io/svgomg/), which is great at
optimizing but doesn't touch fonts.

Everything runs in the browser. No upload, no backend.

## Why this exists

A lot of design tools (Figma exports, Vecta Nano, Illustrator, Inkscape) emit
SVGs that reference fonts by name — `font-family: Roboto-Bold` etc. — without
embedding them. Some emit deprecated SVG `<font>` glyph blocks that no modern
browser renders. Either way, the file looks fine on the designer's machine and
broken everywhere else.

This tool fixes both:

1. Strips deprecated `<font>` blocks.
2. Fetches each referenced font (latin subset, woff2) from
   [Fontsource](https://fontsource.org/) via jsDelivr.
3. Embeds them as `@font-face` rules with `data:` URIs in the SVG's `<style>`.
4. Optionally runs SVGO with safe settings (won't shred the embedded fonts).

The result is a self-contained SVG that renders consistently in any browser,
including when used as `<img src="...">`.

## Quick start

```bash
npm install
npm run dev
```

Opens at <http://localhost:5180>.

Or:

```bash
npm start    # one-shot launcher (installs deps if missing, then runs vite)
```

## Samples

A few test SVGs ship in `public/samples/` — pick one from the UI and click
**Process** to see the before/after. The "Roboto card" sample also includes a
deprecated `<font>` block to demonstrate the strip path.

## Limitations

- Fontsource covers the Google Fonts catalog. Custom or paid fonts aren't
  resolved automatically — drop them into the SVG by hand or extend
  `src/lib/fetchFont.js` with another resolver.
- Latin subset only by default. Add a unicode-range param if you need extended
  scripts.
- Weight inference comes from the family name suffix (`-Bold`, ` Bold`, etc.).
  Ambiguous names (`Roboto`) default to weight 400.

## Stack

- [Vite](https://vitejs.dev/) — dev server + bundler
- [SVGO](https://svgo.dev/) — optional optimization pass
- Vanilla JS, no framework

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Conventional Commits, small PRs.

## License

MIT — see [LICENSE](LICENSE).
