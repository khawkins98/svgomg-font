import { extractFontFamilies, hasDeprecatedSvgFonts, stripDeprecatedSvgFonts } from './lib/parseSvg.js';
import { fetchFontAsBase64 } from './lib/fetchFont.js';
import { embedFontFaces } from './lib/embedFonts.js';
import { svgoPass } from './lib/optimize.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  drop: $('#dropzone'),
  file: $('#file-input'),
  samples: $('#samples'),
  optEmbed: $('#opt-embed'),
  optSvgo: $('#opt-svgo'),
  optStrip: $('#opt-strip-svg-fonts'),
  run: $('#run'),
  download: $('#download'),
  before: $('#before'),
  after: $('#after'),
  beforeMeta: $('#before-meta'),
  afterMeta: $('#after-meta'),
  report: $('#report'),
};

const SAMPLES = [
  { id: 'roboto-card', label: 'Roboto card (deprecated SVG fonts)', file: 'roboto-card.svg' },
  { id: 'open-sans-list', label: 'Open Sans list (no fallback)', file: 'open-sans-list.svg' },
  { id: 'lato-mixed', label: 'Lato regular + bold', file: 'lato-mixed.svg' },
  { id: 'inter-headline', label: 'Inter headline', file: 'inter-headline.svg' },
];

let currentSvg = null;
let currentName = 'output.svg';
let processedSvg = null;

function init() {
  for (const s of SAMPLES) {
    const btn = document.createElement('button');
    btn.textContent = s.label;
    btn.addEventListener('click', () => loadSample(s));
    els.samples.appendChild(btn);
  }

  els.file.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    els.drop.addEventListener(ev, (e) => {
      e.preventDefault();
      els.drop.classList.add('drag');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    els.drop.addEventListener(ev, (e) => {
      e.preventDefault();
      els.drop.classList.remove('drag');
    }),
  );
  els.drop.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });

  els.run.addEventListener('click', process);
  els.download.addEventListener('click', download);
}

async function loadFile(file) {
  if (!/\.svg$/i.test(file.name)) {
    log('err', `"${file.name}" is not an SVG file. Only .svg files are accepted.`);
    return;
  }
  const text = await file.text();
  if (!/<svg[\s>]/i.test(text)) {
    log('err', `"${file.name}" does not appear to be a valid SVG file.`);
    return;
  }
  currentName = file.name.replace(/\.svg$/i, '') + '.web.svg';
  setInput(text);
}

async function loadSample(sample) {
  currentName = sample.file.replace(/\.svg$/i, '') + '.web.svg';
  // Honor Vite's `base` config so this works under a subpath deploy (e.g. /svgomg-font/).
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/samples/${sample.file}`);
  const text = await res.text();
  setInput(text);
}

function setInput(text) {
  currentSvg = text;
  processedSvg = null;
  els.run.disabled = false;
  els.download.disabled = true;
  renderInto(els.before, text);
  els.beforeMeta.textContent = describe(text);
  els.after.innerHTML = '';
  els.afterMeta.textContent = '';
  log('info', 'Loaded SVG. Click Process to embed fonts.');
}

function describe(text) {
  const families = extractFontFamilies(text);
  const hasDep = hasDeprecatedSvgFonts(text);
  const size = new Blob([text]).size;
  return [
    `${size.toLocaleString()} bytes`,
    families.length ? `families: ${families.join(', ')}` : 'no font-family declarations',
    hasDep ? 'deprecated <font> blocks present' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

async function process() {
  if (!currentSvg) return;
  els.run.disabled = true;
  log('info', 'Processing...');

  let out = currentSvg;
  const lines = [];

  if (els.optStrip.checked && hasDeprecatedSvgFonts(out)) {
    const before = out.length;
    out = stripDeprecatedSvgFonts(out);
    lines.push(`Stripped deprecated <font> blocks (-${(before - out.length).toLocaleString()} bytes).`);
  }

  if (els.optEmbed.checked) {
    const families = extractFontFamilies(out);
    if (!families.length) {
      lines.push('No font-family declarations found — nothing to embed.');
    } else {
      lines.push(`Resolving ${families.length} font${families.length === 1 ? '' : 's'} via Fontsource...`);
      const results = await Promise.all(families.map(fetchFontAsBase64));
      const fonts = [];
      for (let i = 0; i < families.length; i++) {
        const r = results[i];
        if (r) {
          fonts.push(r);
          lines.push(`  ✓ ${families[i]} (${r.bytes.toLocaleString()} bytes raw)`);
        } else {
          lines.push(`  ✗ ${families[i]} — not found on Fontsource`);
        }
      }
      out = embedFontFaces(out, fonts);
    }
  }

  if (els.optSvgo.checked) {
    try {
      const before = out.length;
      out = await svgoPass(out);
      lines.push(`SVGO: ${before.toLocaleString()} → ${out.length.toLocaleString()} bytes.`);
    } catch (err) {
      lines.push(`SVGO failed: ${err.message}`);
    }
  }

  processedSvg = out;
  renderInto(els.after, out);
  els.afterMeta.textContent = describe(out);
  els.download.disabled = false;
  els.run.disabled = false;
  log('ok', lines.join('\n'));
}

function renderInto(node, text) {
  // Render via an <img> so any @font-face rules in <style> are exercised
  // the same way the SVG would be when used as an image elsewhere.
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  node.innerHTML = '';
  const img = document.createElement('img');
  img.src = url;
  img.onload = () => URL.revokeObjectURL(url);
  node.appendChild(img);
}

function download() {
  if (!processedSvg) return;
  const blob = new Blob([processedSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function log(level, msg) {
  els.report.innerHTML = '';
  const span = document.createElement('span');
  span.className = level === 'ok' ? 'ok' : level === 'err' ? 'err' : level === 'warn' ? 'warn' : '';
  span.textContent = msg;
  els.report.appendChild(span);
}

init();
