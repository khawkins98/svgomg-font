/**
 * Generates a three-panel comparison SVG for the blog post illustrating
 * the three ways SVG text can be handled:
 *   Panel 1 — Converted to outlines (actual path data, no text nodes)
 *   Panel 2 — Missing font (falls back to Times New Roman)
 *   Panel 3 — SVGOMG-Font: font embedded (Futura subset, correct rendering)
 *
 * Output: blog images dir + standalone demo HTML
 */

import { create as fontkitCreate } from 'fontkit';
import { readFileSync, writeFileSync } from 'fs';

const FONT_PATH = '/System/Library/Fonts/Supplemental/Futura.ttc';
const OUT_SVG  = '../allaboutken-11ty/src/site/images/blog/svgomg-font-comparison.svg';
const OUT_HTML = '../allaboutken-11ty/src/site/images/blog/svgomg-font-demo.html';

// ── Load fonts ────────────────────────────────────────────────────────────────
const tc      = fontkitCreate(readFileSync(FONT_PATH));
const regular = tc.fonts.find(f => f.postscriptName === 'Futura-Medium');
const bold    = tc.fonts.find(f => f.postscriptName === 'Futura-Bold');
const UPM     = regular.unitsPerEm; // 2048

// ── Subset + base64 ──────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:%–-()';

function b64(font) {
  const subset = font.createSubset();
  for (const ch of CHARS) {
    const g = font.glyphForCodePoint(ch.codePointAt(0));
    if (g) subset.includeGlyph(g);
  }
  const bytes = new Uint8Array(subset.encode());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192)
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
}

const b64regular = b64(regular);
const b64bold    = b64(bold);
console.log(`Futura-Medium subset: ${Math.round(b64regular.length / 1024)} KB base64`);
console.log(`Futura-Bold    subset: ${Math.round(b64bold.length / 1024)} KB base64`);

// ── Text → SVG paths ─────────────────────────────────────────────────────────
/**
 * Returns a <g> element containing one <path> per glyph.
 * Coordinate system: SVG (y flipped from font), scaled to `fontSize` px.
 */
function textToPaths(text, font, x, y, fontSize, fill = '#1a0f2e') {
  const scale = fontSize / UPM;
  const run   = font.layout(text);
  let cx = x;
  const paths = [];

  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const raw = glyph.path.toSVG();

    // fontkit paths are in font units, origin at baseline, y-up.
    // We scale and flip y to get SVG coordinates.
    const gx = cx + pos.xOffset * scale;
    const gy = y  - pos.yOffset * scale;

    paths.push(
      `<path transform="translate(${gx.toFixed(2)},${gy.toFixed(2)}) scale(${scale.toFixed(6)},${(-scale).toFixed(6)})" d="${raw}" fill="${fill}"/>`
    );
    cx += pos.xAdvance * scale;
  });

  return `<g>${paths.join('')}</g>`;
}

// ── Anchor-point dots (to make paths look like Illustrator outline mode) ──────
function anchorDots(text, font, x, y, fontSize, color = '#7c3aed') {
  const scale = fontSize / UPM;
  const run   = font.layout(text);
  let cx = x;
  const dots = [];

  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    // Just place one dot at the glyph midpoint as a visual cue
    const gx = cx + (pos.xAdvance * 0.5) * scale;
    const gy = y - UPM * 0.3 * scale;
    dots.push(`<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="2.5" fill="${color}" opacity="0.8"/>`);
    cx += pos.xAdvance * scale;
  });

  return dots.join('');
}

// ── Infographic content ───────────────────────────────────────────────────────
// We draw the same simple bar-chart infographic in all three panels.
// What changes is how the text is rendered.

const BARS = [
  { label: 'Europe',       pct: 84 },
  { label: 'Asia–Pacific', pct: 67 },
  { label: 'Americas',     pct: 91 },
  { label: 'Africa',       pct: 48 },
];

const ACCENT   = '#7c3aed';
const BAR_CLR  = '#a78bfa';
const BG_PANEL = '#f5f3ff';
const INK      = '#1a0f2e';

/**
 * Returns SVG markup for the bar-chart body (geometry only, no text).
 * x,y = top-left of the chart body region.
 */
function barChartGeometry(x, y, w = 200, rowH = 28) {
  const barAreaW = w - 60; // space for label column
  const rects = BARS.map((b, i) => {
    const bw = Math.round(barAreaW * b.pct / 100);
    const by = y + i * rowH;
    return `<rect x="${x + 58}" y="${by + 4}" width="${bw}" height="${rowH - 10}" rx="3" fill="${BAR_CLR}"/>`;
  }).join('');
  return rects;
}

// ── Panel builder ─────────────────────────────────────────────────────────────
const PW = 270; // panel width
const PH = 370; // panel height
const GAP = 20;
const TOTAL_W = 3 * PW + 4 * GAP;
const TOTAL_H = PH + 120;

function panel(index, content, badgeText, badgeColor, footerItems) {
  const px = GAP + index * (PW + GAP);
  const py = 70;
  const badgeBg = badgeColor;

  const badges = footerItems.map((item, i) => {
    const icon = item.ok ? '✓' : '✗';
    const clr  = item.ok ? '#16a34a' : '#dc2626';
    return `<text x="${px + 14}" y="${py + PH - 60 + i * 18}" font-size="11" fill="${clr}" font-family="system-ui, sans-serif">${icon} ${item.label}</text>`;
  }).join('');

  return `
  <!-- Panel ${index + 1} -->
  <rect x="${px}" y="${py}" width="${PW}" height="${PH}" rx="10" fill="${BG_PANEL}" filter="url(#shadow)"/>
  <!-- Badge -->
  <rect x="${px + 10}" y="${py + 10}" width="${PW - 20}" height="24" rx="5" fill="${badgeBg}"/>
  <text x="${px + PW/2}" y="${py + 26}" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff" font-family="system-ui, sans-serif">${badgeText}</text>
  <!-- Infographic area -->
  ${content}
  <!-- Divider -->
  <line x1="${px + 10}" y1="${py + PH - 72}" x2="${px + PW - 10}" y2="${py + PH - 72}" stroke="#e5e7eb" stroke-width="1"/>
  <!-- Footer badges -->
  ${badges}
  `;
}

// ── Build each panel's infographic content ────────────────────────────────────

function infographicContent(px, py, renderTitle, renderLabels, renderPcts, renderCaption) {
  const iy = py + 46;
  const barX = px + 14;
  const rowH = 28;
  const barAreaW = PW - 28 - 60;

  const bars = barChartGeometry(barX, iy + 38, PW - 28, rowH);

  return `
  ${renderTitle(px + PW / 2, iy + 18)}
  ${bars}
  ${BARS.map((b, i) => renderLabels(b.label, barX + 4, iy + 38 + i * rowH + rowH / 2 + 4)).join('')}
  ${BARS.map((b, i) => {
    const bw = Math.round((PW - 28 - 60) * b.pct / 100);
    return renderPcts(`${b.pct}%`, barX + 58 + bw + 4, iy + 38 + i * rowH + rowH / 2 + 4);
  }).join('')}
  ${renderCaption(px + PW / 2, iy + 38 + BARS.length * rowH + 20)}
  `;
}

// ── Panel 1: Outlines ─────────────────────────────────────────────────────────
function panel1Content(px, py) {
  const iy = py + 46;
  const barX = px + 14;
  const rowH = 28;
  const bars = barChartGeometry(barX, iy + 38, PW - 28, rowH);
  const titlePaths = textToPaths('Regional reach', bold, px + 14, iy + 18, 14, INK);
  const labelPaths = BARS.map((b, i) =>
    textToPaths(b.label, regular, barX + 4, iy + 38 + i * rowH + rowH / 2 + 4, 9, '#6b7280')
  ).join('');
  const pctPaths = BARS.map((b, i) => {
    const bw = Math.round((PW - 28 - 60) * b.pct / 100);
    return textToPaths(`${b.pct}%`, bold, barX + 58 + bw + 4, iy + 38 + i * rowH + rowH / 2 + 4, 9, ACCENT);
  }).join('');
  const captionPaths = textToPaths('Source: annual report 2024', regular, px + 14, iy + 38 + BARS.length * rowH + 20, 8, '#9ca3af');

  // Anchor dots on title to hint "this is path data"
  const dots = anchorDots('Regional reach', bold, px + 14, iy + 18, 14);

  return `${titlePaths}${labelPaths}${pctPaths}${captionPaths}${dots}${bars}`;
}

// ── Panel 2: Missing font — will fall back to Times New Roman ─────────────────
function panel2TextEl(text, x, y, size, weight, fill, anchor = 'start') {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="'FuturaCustom','Times New Roman',serif">${text}</text>`;
}

function panel2Content(px, py) {
  const iy = py + 46;
  const barX = px + 14;
  const rowH = 28;
  const bars = barChartGeometry(barX, iy + 38, PW - 28, rowH);
  const title = panel2TextEl('Regional reach', px + 14, iy + 18, 14, 'bold', INK);
  const labels = BARS.map((b, i) =>
    panel2TextEl(b.label, barX + 4, iy + 38 + i * rowH + rowH / 2 + 4, 9, 'normal', '#6b7280')
  ).join('');
  const pcts = BARS.map((b, i) => {
    const bw = Math.round((PW - 28 - 60) * b.pct / 100);
    return panel2TextEl(`${b.pct}%`, barX + 58 + bw + 4, iy + 38 + i * rowH + rowH / 2 + 4, 9, 'bold', ACCENT);
  }).join('');
  const caption = panel2TextEl('Source: annual report 2024', px + 14, iy + 38 + BARS.length * rowH + 20, 8, 'normal', '#9ca3af');
  return `${title}${labels}${pcts}${caption}${bars}`;
}

// ── Panel 3: Embedded font ────────────────────────────────────────────────────
function panel3TextEl(text, x, y, size, weight, fill, anchor = 'start') {
  const ps = weight === 'bold' ? 'Futura-Bold' : 'Futura-Medium';
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="'${ps}',system-ui,sans-serif">${text}</text>`;
}

function panel3Content(px, py) {
  const iy = py + 46;
  const barX = px + 14;
  const rowH = 28;
  const bars = barChartGeometry(barX, iy + 38, PW - 28, rowH);
  const title = panel3TextEl('Regional reach', px + 14, iy + 18, 14, 'bold', INK);
  const labels = BARS.map((b, i) =>
    panel3TextEl(b.label, barX + 4, iy + 38 + i * rowH + rowH / 2 + 4, 9, 'normal', '#6b7280')
  ).join('');
  const pcts = BARS.map((b, i) => {
    const bw = Math.round((PW - 28 - 60) * b.pct / 100);
    return panel3TextEl(`${b.pct}%`, barX + 58 + bw + 4, iy + 38 + i * rowH + rowH / 2 + 4, 9, 'bold', ACCENT);
  }).join('');
  const caption = panel3TextEl('Source: annual report 2024', px + 14, iy + 38 + BARS.length * rowH + 20, 8, 'normal', '#9ca3af');
  return `${title}${labels}${pcts}${caption}${bars}`;
}

// ── Assemble SVG ──────────────────────────────────────────────────────────────
const p1x = GAP;
const p2x = GAP + PW + GAP;
const p3x = GAP + 2 * (PW + GAP);
const py  = 70;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_W}" height="${TOTAL_H}" viewBox="0 0 ${TOTAL_W} ${TOTAL_H}">
<defs>
  <style>
    @font-face {
      font-family: 'Futura-Medium';
      src: url('data:font/truetype;base64,${b64regular}') format('truetype');
      font-weight: normal;
    }
    @font-face {
      font-family: 'Futura-Bold';
      src: url('data:font/truetype;base64,${b64bold}') format('truetype');
      font-weight: bold;
    }
  </style>
  <filter id="shadow" x="-5%" y="-5%" width="115%" height="120%">
    <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1a0f2e" flood-opacity="0.12"/>
  </filter>
</defs>

<!-- Background -->
<rect width="${TOTAL_W}" height="${TOTAL_H}" fill="#1a0f2e"/>
<!-- Subtle grid texture -->
<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
  <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>
</pattern>
<rect width="${TOTAL_W}" height="${TOTAL_H}" fill="url(#grid)"/>

<!-- Title -->
<text x="${TOTAL_W / 2}" y="44" text-anchor="middle" font-size="15" font-weight="bold" fill="#e9d5ff" font-family="system-ui, sans-serif">Three ways to handle fonts in an SVG infographic</text>

${panel(0,
  panel1Content(p1x, py),
  '✗  Text converted to outlines',
  '#dc2626',
  [
    { label: 'Inaccessible (no text nodes)', ok: false },
    { label: 'Not searchable',               ok: false },
    { label: 'Cannot be translated',         ok: false },
    { label: 'Visual rendering: correct',    ok: true  },
  ]
)}

${panel(1,
  panel2Content(p2x, py),
  '⚠  Font missing — system fallback',
  '#b45309',
  [
    { label: 'Text still accessible',        ok: true  },
    { label: 'Searchable',                   ok: true  },
    { label: 'Wrong font renders',           ok: false },
    { label: 'Layout may break',             ok: false },
  ]
)}

${panel(2,
  panel3Content(p3x, py),
  '✓  Font embedded (SVGOMG-Font)',
  '#15803d',
  [
    { label: 'Fully accessible',             ok: true  },
    { label: 'Searchable + translatable',    ok: true  },
    { label: 'Correct font everywhere',      ok: true  },
    { label: 'Visual rendering: correct',    ok: true  },
  ]
)}

<!-- Column labels -->
<text x="${p1x + PW/2}" y="${py + PH + 28}" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.45)" font-family="system-ui,sans-serif">Paths, not text</text>
<text x="${p2x + PW/2}" y="${py + PH + 28}" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.45)" font-family="system-ui,sans-serif">Times New Roman fallback</text>
<text x="${p3x + PW/2}" y="${py + PH + 28}" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.45)" font-family="system-ui,sans-serif">Futura embedded via SVGOMG-Font</text>

</svg>`;

writeFileSync(OUT_SVG, svg);
console.log(`Wrote ${OUT_SVG}`);

// ── Also write a standalone HTML demo ────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SVGOMG-Font — before vs after demo</title>
<style>
  body { font-family: system-ui, sans-serif; background: #1a0f2e; color: #e9d5ff; margin: 0; padding: 2rem; }
  h1 { font-size: 1.25rem; text-align: center; margin-bottom: 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1000px; margin: 0 auto; }
  .card { background: #f5f3ff; border-radius: 10px; padding: 1.25rem; color: #1a0f2e; }
  .badge { display: inline-block; border-radius: 5px; padding: .25rem .75rem; font-size: .8rem; font-weight: bold; color: #fff; margin-bottom: 1rem; }
  .badge-bad    { background: #dc2626; }
  .badge-warn   { background: #b45309; }
  .badge-good   { background: #15803d; }
  .infographic { border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem; background: #fff; }
  .bar-row { display: flex; align-items: center; gap: .5rem; margin: .35rem 0; font-size: .82rem; }
  .bar-label { width: 90px; text-align: right; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar { height: 16px; border-radius: 3px; background: #a78bfa; }
  .bar-pct { color: #7c3aed; font-weight: bold; font-size: .8rem; }
  .title-futura     { font-family: 'Futura-Medium', system-ui; font-weight: bold; font-size: .95rem; margin-bottom: .75rem; }
  .title-fallback   { font-family: 'FuturaCustom', 'Times New Roman', serif; font-weight: bold; font-size: .95rem; margin-bottom: .75rem; }
  .label-futura     { font-family: 'Futura-Medium', system-ui; }
  .label-fallback   { font-family: 'FuturaCustom', 'Times New Roman', serif; }
  .caption-futura   { font-family: 'Futura-Medium', system-ui; font-size: .7rem; color: #9ca3af; margin-top: .75rem; }
  .caption-fallback { font-family: 'FuturaCustom', 'Times New Roman', serif; font-size: .7rem; color: #9ca3af; margin-top: .75rem; }
  .checks { list-style: none; padding: 0; margin: .75rem 0 0; font-size: .82rem; }
  .checks li { margin: .2rem 0; }
  .checks .ok  { color: #16a34a; }
  .checks .bad { color: #dc2626; }
  @font-face { font-family: 'Futura-Medium'; src: url('data:font/truetype;base64,${b64regular}') format('truetype'); }
  @font-face { font-family: 'Futura-Bold';   src: url('data:font/truetype;base64,${b64bold}')   format('truetype'); }
</style>
</head>
<body>
<h1>Three ways to handle fonts in an SVG infographic</h1>
<div class="grid">

  <div class="card">
    <span class="badge badge-bad">✗ Text converted to outlines</span>
    <div class="infographic">
      <p class="title-futura" style="font-family:system-ui">Regional reach</p>
      ${BARS.map(b => `
      <div class="bar-row">
        <span class="bar-label label-futura" style="font-family:system-ui">${b.label}</span>
        <div class="bar" style="width:${b.pct * 1.4}px"></div>
        <span class="bar-pct" style="font-family:system-ui">${b.pct}%</span>
      </div>`).join('')}
      <p class="caption-futura" style="font-family:system-ui">Source: annual report 2024</p>
    </div>
    <ul class="checks">
      <li class="bad">✗ Path data — no text nodes</li>
      <li class="bad">✗ Invisible to screen readers</li>
      <li class="bad">✗ Not searchable or translatable</li>
      <li class="ok">✓ Visual rendering correct</li>
    </ul>
    <p style="font-size:.75rem;color:#6b7280;margin-top:.5rem">Note: this demo uses live text styled as system-ui to approximate the visual. A real outlines export contains only &lt;path&gt; elements — the text above is for illustration.</p>
  </div>

  <div class="card">
    <span class="badge badge-warn">⚠ Font missing — system fallback</span>
    <div class="infographic">
      <p class="title-fallback">Regional reach</p>
      ${BARS.map(b => `
      <div class="bar-row">
        <span class="bar-label label-fallback">${b.label}</span>
        <div class="bar" style="width:${b.pct * 1.4}px"></div>
        <span class="bar-pct label-fallback">${b.pct}%</span>
      </div>`).join('')}
      <p class="caption-fallback">Source: annual report 2024</p>
    </div>
    <ul class="checks">
      <li class="ok">✓ Text nodes — accessible</li>
      <li class="ok">✓ Searchable</li>
      <li class="bad">✗ Falls back to Times New Roman</li>
      <li class="bad">✗ Layout may break</li>
    </ul>
  </div>

  <div class="card">
    <span class="badge badge-good">✓ Font embedded (SVGOMG-Font)</span>
    <div class="infographic">
      <p class="title-futura">Regional reach</p>
      ${BARS.map(b => `
      <div class="bar-row">
        <span class="bar-label label-futura">${b.label}</span>
        <div class="bar" style="width:${b.pct * 1.4}px"></div>
        <span class="bar-pct label-futura">${b.pct}%</span>
      </div>`).join('')}
      <p class="caption-futura">Source: annual report 2024</p>
    </div>
    <ul class="checks">
      <li class="ok">✓ Real text — fully accessible</li>
      <li class="ok">✓ Searchable and translatable</li>
      <li class="ok">✓ Correct font on every device</li>
      <li class="ok">✓ Editable in the source file</li>
    </ul>
  </div>

</div>
<p style="text-align:center;margin-top:2rem;font-size:.85rem;opacity:.5">
  Try it: <a href="https://khawkins98.github.io/svgomg-font/" style="color:#a78bfa">khawkins98.github.io/svgomg-font</a>
</p>
</body>
</html>`;

writeFileSync(OUT_HTML, html);
console.log(`Wrote ${OUT_HTML}`);
