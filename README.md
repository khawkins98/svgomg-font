<a href="https://www.allaboutken.com/svgomg-font/">
  <img src="public/logo.svg" alt="SVGOMG-Font — Stop shipping SVGs with broken text" width="900"/>
</a>

# SVGOMG-Font

[![CI](https://github.com/khawkins98/svgomg-font/actions/workflows/ci.yml/badge.svg)](https://github.com/khawkins98/svgomg-font/actions/workflows/ci.yml)

**[Try it live →](https://www.allaboutken.com/svgomg-font/)**

Drop in an SVG that references fonts by name. Get back an SVG with font data
embedded as base64 — so the fonts travel with the file, including when used
as an `<img>` on a machine without those fonts installed.

The tool fetches WOFF2 fonts from [Fontsource](https://fontsource.org/) via
jsDelivr and can use installed or uploaded fonts when automatic lookup fails.
Glyph subsetting and an optional [SVGO](https://svgo.dev/) pass help reduce
output size. Everything runs in your browser — no SVG upload, backend, or account.
Font lookup still makes network requests to the CDN.

> A companion to [SVGOMG](https://jakearchibald.github.io/svgomg/), which is
> great at optimizing SVGs but doesn't touch fonts.

## Usage

1. Open the live app and use **Choose file**, drop an `.svg` file, or paste
   SVG markup with **Paste SVG** or Cmd+V / Ctrl+V. You can also start with a sample.
2. Processing starts automatically. Compare **Before** and **After**, then
   check the report for missing faces and assumed weights. A correct-looking
   preview alone does not prove a font was embedded: your device may already have it.
3. For a missing face, use **Upload font** with a `.woff2`, `.woff`, `.ttf`, or
   `.otf` file. Where the browser supports it, installed-font detection may
   prompt for permission; **Detect installed fonts** or **Retry font detection**
   lets you try again. Only embed fonts whose license permits redistribution;
   the tool does not verify font rights.
4. Adjust **Options** if needed; changes reprocess the original SVG. **Embed
   fonts**, **Strip `<font>`**, and **Subset glyphs** start enabled; **Optimize
   (SVGO)** starts disabled. **Background** changes only the preview canvas.
5. Choose **Download fixed SVG** (saved as `<name>-embedded.svg`) or **Copy SVG**.
   Test that file in its intended viewer before sharing it. If clipboard access
   is blocked, use the keyboard shortcut to paste input and download the output.

## Samples

The app's samples are also in [`public/samples/`](public/samples/). **Roboto
card** exercises deprecated `<font>` stripping, **Lato regular + bold** uses
mixed weights, and **Helvetica Neue report** and **Optima quote** exercise the
installed/uploaded-font fallback. Select a sample to process it automatically.

## Limitations

- Automatic lookup requests Fontsource's Latin WOFF2 file, trying Latin Extended
  only if that request fails. It does not select a character subset by the SVG's
  language. For other scripts, supply a font with the required glyphs.
- CDN weight/style inference uses family-name suffixes (`Roboto-Bold`,
  `Roboto-Bold-Italic`). A bare `Roboto` resolves to weight 400 even if the SVG
  separately declares `font-weight="700"`; check the report and appearance.
- Installed-font detection requires browser support for the Local Font Access
  API and permission. Manual upload is the fallback when detection is unavailable,
  blocked, or finds no match.
- Subsetting keeps the used characters plus Basic Latin and may produce TrueType
  data rather than WOFF2. It retains the original font if subsetting fails or
  increases size. Disable **Subset glyphs** if you need more characters for later edits.
- Embedded fonts preserve `<text>` nodes; accessibility still depends on the
  SVG markup and how it is embedded. Email clients and other viewers may strip
  SVGs, styles, or embedded fonts. Check the destination's support.

See [ABOUT.md](ABOUT.md) for the pipeline and the tradeoffs behind embedding.

## Local development

See [local setup in CONTRIBUTING.md](CONTRIBUTING.md#local-setup) for prerequisites,
installation, the dev-server URL, and checks. The app uses Vite, SVGO, fontkit,
and vanilla JavaScript; it has no component framework or backend.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Conventional Commits, small PRs.

## License

MIT — see [LICENSE](LICENSE). Font licenses are separate from the app's license.
