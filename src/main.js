import { extractFontFamilies, hasDeprecatedSvgFonts, stripDeprecatedSvgFonts } from './lib/parseSvg.js';
import { fetchFontAsBase64 } from './lib/fetchFont.js';
import { embedFontFaces } from './lib/embedFonts.js';
import { svgoPass } from './lib/optimize.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  drop: $('#dropzone'),
  file: $('#file-input'),
  heroFileBtn: $('#hero-file-btn'),
  replaceBtn: $('#replace-btn'),
  loadedName: $('#loaded-name'),
  closeBtn: $('#close-btn'),
  splitView: $('#split-view'),
  splitHandle: $('#split-handle'),
  beforePane: $('#before-pane'),
  samples: $('#samples'),
  optEmbed: $('#opt-embed'),
  optSvgo: $('#opt-svgo'),
  optStrip: $('#opt-strip-svg-fonts'),
  optBgColor: $('#opt-bg-color'),
  download: $('#download'),
  before: $('#before'),
  after: $('#after'),
  beforeMeta: $('#before-meta'),
  afterMeta: $('#after-meta'),
  report: $('#report'),
  aboutBtn: $('#about-btn'),
  aboutDialog: $('#about-dialog'),
  aboutClose: $('#about-close'),
};

const SAMPLES = [
  { id: 'roboto-card',    name: 'Roboto card',          hint: 'deprecated SVG fonts',  file: 'roboto-card.svg' },
  { id: 'open-sans-list', name: 'Open Sans list',        hint: 'no system fallback',    file: 'open-sans-list.svg' },
  { id: 'lato-mixed',     name: 'Lato regular + bold',   hint: 'mixed weights',         file: 'lato-mixed.svg' },
  { id: 'inter-headline', name: 'Inter headline',        hint: 'modern sans-serif',     file: 'inter-headline.svg' },
];

let currentSvg = null;
let currentName = 'output.svg';
let sourceName = '';
let processedSvg = null;
let runId = 0;
const fontCache = new Map();

function closeFile() {
  runId++; // cancel any in-flight process()
  currentSvg = null;
  processedSvg = null;
  sourceName = '';
  fontCache.clear();
  els.before.innerHTML = '';
  els.after.innerHTML = '';
  els.beforeMeta.textContent = '';
  els.afterMeta.textContent = '';
  els.report.innerHTML = '';
  els.loadedName.textContent = '';
  els.download.hidden = true;
  els.splitView.style.removeProperty('--split'); // reset to CSS default 50%
  document.body.classList.remove('has-file');
}

function init() {
  for (const s of SAMPLES) {
    const btn = document.createElement('button');
    const nameEl = document.createElement('span');
    nameEl.className = 'sample-name';
    nameEl.textContent = s.name;
    const hintEl = document.createElement('span');
    hintEl.className = 'sample-hint';
    hintEl.textContent = s.hint;
    btn.append(nameEl, hintEl);
    btn.addEventListener('click', () => loadSample(s));
    els.samples.appendChild(btn);
  }

  els.aboutBtn.addEventListener('click', () => els.aboutDialog.showModal());
  els.aboutClose.addEventListener('click', () => els.aboutDialog.close());
  els.aboutDialog.addEventListener('click', (e) => {
    if (e.target === els.aboutDialog) els.aboutDialog.close();
  });

  const openFilePicker = () => { els.file.value = ''; els.file.click(); };
  els.heroFileBtn.addEventListener('click', openFilePicker);
  els.replaceBtn.addEventListener('click', openFilePicker);

  els.closeBtn.addEventListener('click', closeFile);

  // Split-view drag handle
  let splitting = false;
  els.splitHandle.addEventListener('pointerdown', (e) => {
    splitting = true;
    els.splitHandle.setPointerCapture(e.pointerId);
  });
  const updateSplit = (e) => {
    if (!splitting) return;
    const rect = els.splitView.getBoundingClientRect();
    const pct = Math.min(90, Math.max(10, ((e.clientX - rect.left) / rect.width) * 100));
    els.splitView.style.setProperty('--split', `${pct}%`);
  };
  const endSplit = () => { splitting = false; };
  els.splitHandle.addEventListener('pointermove', updateSplit);
  els.splitHandle.addEventListener('pointerup', endSplit);
  els.splitHandle.addEventListener('pointercancel', endSplit);
  els.splitHandle.addEventListener('lostpointercapture', endSplit);
  // Keyboard split adjust
  els.splitHandle.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const cur = parseFloat(els.splitView.style.getPropertyValue('--split')) || 50;
    const next = e.key === 'ArrowLeft' ? Math.max(10, cur - 5) : Math.min(90, cur + 5);
    els.splitView.style.setProperty('--split', `${next}%`);
  });

  els.file.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    document.addEventListener(ev, (e) => {
      e.preventDefault();
      els.drop.classList.add('drag');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    document.addEventListener(ev, (e) => {
      e.preventDefault();
      els.drop.classList.remove('drag');
    }),
  );
  document.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });

  [els.optEmbed, els.optSvgo, els.optStrip].forEach((cb) =>
    cb.addEventListener('change', () => { if (currentSvg) process(); }),
  );
  els.optBgColor.addEventListener('input', (e) => {
    els.splitView.style.setProperty('--canvas-bg', e.target.value);
  });
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
  sourceName = file.name;
  currentName = file.name.replace(/\.svg$/i, '') + '.web.svg';
  setInput(text);
}

async function loadSample(sample) {
  sourceName = sample.file;
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
  els.download.hidden = true;
  els.loadedName.textContent = sourceName;
  renderInto(els.before, text);
  els.beforeMeta.textContent = describe(text);
  els.after.innerHTML = '';
  els.afterMeta.textContent = '';
  document.body.classList.add('has-file');
  process();
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
  const myRunId = ++runId;
  const opts = { embed: els.optEmbed.checked, svgo: els.optSvgo.checked, strip: els.optStrip.checked };
  log('info', 'Processing…');

  let out = currentSvg;
  const lines = [];
  let noFontFound = false;

  try {
    if (opts.strip && hasDeprecatedSvgFonts(out)) {
      const before = out.length;
      out = stripDeprecatedSvgFonts(out);
      lines.push(`Stripped deprecated <font> blocks (-${(before - out.length).toLocaleString()} bytes).`);
    }

    if (opts.embed) {
      const families = extractFontFamilies(out);
      if (!families.length) {
        noFontFound = true;
      } else {
        lines.push(`Resolving ${families.length} font${families.length === 1 ? '' : 's'} via Fontsource…`);
        const results = await Promise.all(families.map((f) => {
          if (!fontCache.has(f)) fontCache.set(f, fetchFontAsBase64(f));
          return fontCache.get(f);
        }));
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

    if (opts.svgo) {
      try {
        const before = out.length;
        out = await svgoPass(out);
        lines.push(`SVGO: ${before.toLocaleString()} → ${out.length.toLocaleString()} bytes.`);
      } catch (err) {
        lines.push(`SVGO failed: ${err.message}`);
      }
    }

    if (runId !== myRunId) return;
    processedSvg = out;
    renderInto(els.after, out);
    els.afterMeta.textContent = describe(out);
    els.download.hidden = false;

    if (noFontFound) {
      // Rich warning — this SVG has no fonts for us to fix
      els.report.innerHTML = '';
      const warn = document.createElement('span');
      warn.className = 'warn';
      warn.innerHTML =
        'No <code>font-family</code> declarations found — this SVG has no fonts to embed.\n' +
        'Wrong tool? If you just need to optimise an SVG, try ' +
        '<a href="https://svgomg.net/" target="_blank" rel="noreferrer">SVGOMG →</a>';
      els.report.appendChild(warn);
      if (lines.length) {
        const extra = document.createElement('span');
        extra.textContent = '\n' + lines.join('\n');
        els.report.appendChild(extra);
      }
    } else {
      log('ok', lines.join('\n'));
    }
  } catch (err) {
    if (runId !== myRunId) return;
    log('err', `Processing failed: ${err.message}`);
  }
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
