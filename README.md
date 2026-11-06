<a href="https://www.allaboutken.com/svgomg-font/">
  <img src="public/logo.svg" alt="SVGOMG-Font — Stop shipping SVGs with broken text" width="900"/>
</a>

# SVGOMG-Font

[![CI](https://github.com/khawkins98/svgomg-font/actions/workflows/ci.yml/badge.svg)](https://github.com/khawkins98/svgomg-font/actions/workflows/ci.yml)

**[Try it live →](https://www.allaboutken.com/svgomg-font/)**

Drop in an SVG that references web fonts. Get back the same SVG with those
fonts embedded as base64 WOFF2 — so text renders reliably in any browser,
including when the file is used as an `<img>`, emailed, or opened on a
machine without the original fonts installed.

Optional [SVGO](https://svgo.dev/) pass strips editor cruft on the way out.
Everything runs in your browser — no upload, no backend, no account.

> A companion to [SVGOMG](https://jakearchibald.github.io/svgomg/), which is
> great at optimizing SVGs but doesn't touch fonts.

## Fix an SVG

1. Open the live app and drop an `.svg`, use **Choose file**, or pick a sample.
   Processing starts automatically.
2. Compare the before/after views and check the font report. **Embed fonts**,
   **Strip `<font>`** and **Subset glyphs** start enabled; **Optimize (SVGO)** is optional.
   Changing an option processes the original SVG again.
3. Resolve any missing-font warnings before sharing. Use **Upload font** or drag
   a font onto its face row. Installed-font detection is available when the browser
   supports it and you allow access.
4. Choose **Download fixed SVG** to save `<name>-embedded.svg`, or **Copy SVG** to
   copy the output markup. If clipboard access fails, download the file instead.

A preview can look correct because a font is installed on your device even when
it has not been embedded. Check the report, then test the downloaded SVG where
you plan to use it. Download remains available when some fonts are unresolved.

## Fonts and options

- Fontsource fonts are fetched through jsDelivr, so the first lookup needs a
  network connection. Your SVG is processed in the browser.
- For a missing face, add a `.woff2`, `.woff`, `.ttf` or `.otf` file. Only embed fonts
  whose licence permits redistribution; the app does not verify those rights.
- **Subset glyphs** keeps used characters plus Basic Latin. It uses the full font
  if subsetting fails or produces a larger result. Reprocess after adding text
  that needs characters outside the subset.
- The automatic resolver tries Latin, then Latin Extended; it does not provide
  every script. Weight hints such as `-Bold` are read from the family name;
  ambiguous names default to 400. Check the report when the weight looks wrong.

[How font resolution and embedding work](ABOUT.md) covers local detection,
output formats, subsetting and the tradeoff with outlining.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open <http://localhost:5180/svgomg-font/>. Or use `npm start` for a one-shot
launch that installs dependencies if missing. [Contributing](CONTRIBUTING.md)
covers tests, lint, builds and project rules.

## License

MIT — see [LICENSE](LICENSE).
