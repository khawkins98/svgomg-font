import { extractFontFamilies, extractFontFaces, hasDeprecatedSvgFonts, stripDeprecatedSvgFonts } from './lib/parseSvg.js';
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
  fontUploads: $('#font-uploads'),
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
  { id: 'helvetica-neue', name: 'Helvetica Neue report', hint: 'font not on Fontsource', file: 'helvetica-neue-report.svg' },
  { id: 'optima-quote',   name: 'Optima quote',          hint: 'macOS local font test',  file: 'optima-quote.svg' },
];

let currentSvg = null;
let currentName = 'output.svg';
let sourceName = '';
let processedSvg = null;
let runId = 0;
const fontCache = new Map();

// SVG preview zoom/pan state
let svgZoom = 0.75, svgPanX = 0, svgPanY = 0;

function applySvgTransform() {
  document.querySelectorAll('.zoom-wrap').forEach(el => {
    el.style.transform = `translate(${svgPanX}px, ${svgPanY}px) scale(${svgZoom})`;
  });
}

function resetSvgView() { svgZoom = 0.75; svgPanX = 0; svgPanY = 0; }
function stepZoom(f) { svgZoom = Math.max(0.05, Math.min(20, svgZoom * f)); applySvgTransform(); }

function loadPastedSvg(text) {
  sourceName = 'pasted.svg';
  currentName = 'pasted.web.svg';
  setInput(text);
}

function showDropzoneError(msg) {
  const el = document.getElementById('dropzone-error');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 4000);
}
// User-supplied font files keyed by "family|weight|style"
const userFonts = new Map();
// Tracks the outcome of the Local Font Access API attempt for the current file.
// null = not tried yet, 'unavailable' = API absent, 'denied' = permission blocked,
// 'notfound' = tried but no match, 'found' = at least one face resolved
let localFontCheckResult = null;

/**
 * Makes a floating panel draggable (via its drag bar) and resizable from any
 * edge/corner. Uses Pointer Events so it works with mouse, touch, and pen.
 */
function makePanelInteractive(panel, dragBar) {
  const EDGE = 8;
  const MIN_W = 200;
  const MIN_H = 60;

  function getEdgeDir(e, r) {
    const n = e.clientY - r.top    < EDGE;
    const s = r.bottom - e.clientY < EDGE;
    const w = e.clientX - r.left   < EDGE;
    const ew = r.right - e.clientX < EDGE;
    if (n && w)  return 'nw'; if (n && ew) return 'ne';
    if (s && w)  return 'sw'; if (s && ew) return 'se';
    if (n) return 'n'; if (s) return 's';
    if (w) return 'w'; if (ew) return 'e';
    return null;
  }

  // Mouse hover: update resize cursor from current pointer position
  panel.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons !== 0) return;
    if (e.target.matches('button,input,a,label,select,textarea')) { panel.style.cursor = ''; return; }
    const dir = getEdgeDir(e, panel.getBoundingClientRect());
    panel.style.cursor = dir ? `${dir}-resize` : '';
  });
  panel.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') panel.style.cursor = ''; });

  // Resize: pointerdown in edge zone (recompute direction here for touch support)
  panel.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const dir = getEdgeDir(e, panel.getBoundingClientRect());
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    beginInteraction(e, dir);
  });

  // Drag: pointerdown on drag bar — always a move, never a resize
  dragBar.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    if (e.target.matches('button,input,a')) return;
    e.preventDefault();
    e.stopPropagation();
    beginInteraction(e, null);
  });

  function beginInteraction(e, dir) {
    const r      = panel.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const startL = panel.offsetLeft, startT = panel.offsetTop;
    const startW = r.width,  startH = r.height;

    panel.style.left = startL + 'px'; panel.style.top  = startT + 'px';
    panel.style.right = 'auto';       panel.style.bottom = 'auto';
    if (dir) { panel.style.width = startW + 'px'; panel.style.height = startH + 'px'; }

    panel.setPointerCapture(e.pointerId);
    document.body.style.cursor     = dir ? `${dir}-resize` : 'grabbing';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!dir) {
        panel.style.left = (startL + dx) + 'px';
        panel.style.top  = (startT + dy) + 'px';
      } else {
        if (dir.includes('e')) panel.style.width  = Math.max(MIN_W, startW + dx) + 'px';
        if (dir.includes('s')) panel.style.height = Math.max(MIN_H, startH + dy) + 'px';
        if (dir.includes('w')) {
          const nw = Math.max(MIN_W, startW - dx);
          panel.style.width = nw + 'px';
          panel.style.left  = (startL + startW - nw) + 'px';
        }
        if (dir.includes('n')) {
          const nh = Math.max(MIN_H, startH - dy);
          panel.style.height = nh + 'px';
          panel.style.top    = (startT + startH - nh) + 'px';
        }
      }
    };
    const cleanup = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      panel.removeEventListener('pointermove', onMove);
      panel.removeEventListener('pointerup',           cleanup);
      panel.removeEventListener('pointercancel',       cleanup);
      panel.removeEventListener('lostpointercapture',  cleanup);
    };
    panel.addEventListener('pointermove',          onMove);
    panel.addEventListener('pointerup',            cleanup);
    panel.addEventListener('pointercancel',        cleanup);
    panel.addEventListener('lostpointercapture',   cleanup);
  }
}

// Styled console logger — keeps DevTools output consistent and readable.
function clog(level, ...parts) {
  const c = { ok: '#4ade80', warn: '#fbbf24', err: '#f87171', local: '#60a5fa', info: '#a78bfa' };
  const color = c[level] ?? c.info;
  console.log(
    `%c[SVGOMG]%c ${parts.join(' ')}`,
    `color:${color};font-weight:bold;font-family:monospace`,
    'color:inherit;font-family:monospace',
  );
}

function faceKey(face) {
  return `${face.family}|${face.weight}|${face.style}`;
}

function closeFile() {
  runId++; // cancel any in-flight process()
  currentSvg = null;
  processedSvg = null;
  sourceName = '';
  fontCache.clear();
  userFonts.clear();
  localFontCheckResult = null;
  resetSvgView();
  els.before.innerHTML = '';
  els.after.innerHTML = '';
  els.beforeMeta.textContent = '';
  els.afterMeta.textContent = '';
  els.report.innerHTML = '';
  els.fontUploads.innerHTML = '';
  els.fontUploads.hidden = true;
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

  // Zoom (scroll) and pan (drag) on the SVG preview area
  els.splitView.addEventListener('wheel', (e) => {
    if (!document.body.classList.contains('has-file')) return;
    if (e.target.closest('.hud, .split-handle')) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const factor = delta < 0 ? 1.1 : 1 / 1.1;
    const r = els.splitView.getBoundingClientRect();
    // Keep the point under the cursor stationary during zoom
    const cx = e.clientX - r.left - r.width  / 2;
    const cy = e.clientY - r.top  - r.height / 2;
    svgPanX = cx - (cx - svgPanX) * factor;
    svgPanY = cy - (cy - svgPanY) * factor;
    svgZoom = Math.max(0.05, Math.min(20, svgZoom * factor));
    applySvgTransform();
  }, { passive: false });

  // Drag-to-pan on the canvas background (not on panels, handle, or controls)
  els.splitView.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    if (e.target.closest('.hud, .split-handle, button, input, a, label, select')) return;
    if (!document.body.classList.contains('has-file')) return;
    e.preventDefault();
    els.splitView.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY;
    const px0 = svgPanX, py0 = svgPanY;
    els.splitView.style.cursor = 'grabbing';
    const onMove = (e) => { svgPanX = px0 + e.clientX - sx; svgPanY = py0 + e.clientY - sy; applySvgTransform(); };
    const cleanup = () => {
      els.splitView.style.cursor = '';
      els.splitView.removeEventListener('pointermove',          onMove);
      els.splitView.removeEventListener('pointerup',            cleanup);
      els.splitView.removeEventListener('pointercancel',        cleanup);
      els.splitView.removeEventListener('lostpointercapture',   cleanup);
    };
    els.splitView.addEventListener('pointermove',         onMove);
    els.splitView.addEventListener('pointerup',           cleanup);
    els.splitView.addEventListener('pointercancel',       cleanup);
    els.splitView.addEventListener('lostpointercapture',  cleanup);
  });

  // Double-click canvas to reset zoom/pan
  els.splitView.addEventListener('dblclick', (e) => {
    if (e.target.closest('.hud, .split-handle, button, input, a')) return;
    resetSvgView(); applySvgTransform();
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

  // Keyboard shortcuts for zoom: Cmd/Ctrl + =|+ (zoom in), - (zoom out), 0 (reset)
  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('has-file')) return;
    if (e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable]')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); stepZoom(1.25); }
    else if (mod && e.key === '-')               { e.preventDefault(); stepZoom(1 / 1.25); }
    else if (mod && e.key === '0')               { e.preventDefault(); resetSvgView(); applySvgTransform(); }
  });

  // Paste SVG from clipboard (Cmd+V or Ctrl+V anywhere on the page)
  document.addEventListener('paste', (e) => {
    if (e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable]')) return;
    const text = e.clipboardData?.getData('text') ?? '';
    if (/<svg[\s>]/i.test(text)) { e.preventDefault(); loadPastedSvg(text); return; }
    const svgItem = Array.from(e.clipboardData?.items ?? []).find(it => it.type === 'image/svg+xml');
    if (svgItem) { e.preventDefault(); svgItem.getAsString(loadPastedSvg); }
  });

  // "Paste SVG" button in the dropzone
  const pasteBtn = document.getElementById('paste-btn');
  if (pasteBtn) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!/<svg[\s>]/i.test(text)) { showDropzoneError('No SVG found in clipboard. Copy SVG markup first.'); return; }
        loadPastedSvg(text);
      } catch { showDropzoneError('Clipboard access blocked — press Cmd+V or Ctrl+V to paste.'); }
    });
  }

  makePanelInteractive(document.querySelector('.hud-left'),  document.querySelector('.hud-left  .hud-drag-bar'));
  makePanelInteractive(document.querySelector('.hud-right'), document.querySelector('.hud-right .hud-drag-bar'));

  // Branded boot banner — plain text, no %c; # and space only = consistent in any monospace font
  console.log(
`<!--
 #####  #     #  #####  ####### #     #  #####  ###
#     # #     # #     # #     # ##   ## #     # ###
#       #     # #       #     # # # # # #       ###
 #####  #     # #  #### #     # #  #  # #  ####  #
      #  #   #  #     # #     # #     # #     #
#     #   # #   #     # #     # #     # #     # ###
 #####     #     #####  ####### #     #  #####  ###

  Oh My Goodness... Fonts! ✦
  Open-source SVG font embedder
  github.com/khawkins98/svgomg-font
-->`
  );
  const hasChr = 'queryLocalFonts' in window;
  clog(hasChr ? 'local' : 'warn',
    hasChr ? '🔍 Local Font Access API available (Chrome/Edge)' : '⚠ Local Font Access API not available in this browser',
  );
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
  userFonts.clear();
  localFontCheckResult = null;
  resetSvgView();
  els.fontUploads.innerHTML = '';
  els.fontUploads.hidden = true;
  els.download.hidden = true;
  els.loadedName.textContent = sourceName;
  renderInto(els.before, text);
  els.beforeMeta.textContent = describe(text);
  els.after.innerHTML = '';
  els.afterMeta.textContent = '';
  document.body.classList.add('has-file');
  const kb = (new Blob([text]).size / 1024).toFixed(1);
  const families = extractFontFamilies(text);
  clog('info', `📄 Loaded: ${sourceName || 'pasted SVG'} (${kb} KB)`,
    families.length ? `· fonts: ${families.join(', ')}` : '· no font-family declarations');
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

function describeAfter(text, embeddedCount, anyMissing) {
  const size = new Blob([text]).size;
  const parts = [`${size.toLocaleString()} bytes`];
  if (embeddedCount > 0) {
    const faces = `${embeddedCount} font face${embeddedCount === 1 ? '' : 's'} embedded`;
    if (!anyMissing) {
      parts.push(`<span class="meta-embedded">${faces} · renders everywhere ✓</span>`);
    } else {
      parts.push(`<span class="meta-embedded meta-partial">${faces} · some faces missing</span>`);
    }
  }
  return parts.join(' · ');
}

async function process() {
  if (!currentSvg) return;
  const myRunId = ++runId;
  const opts = { embed: els.optEmbed.checked, svgo: els.optSvgo.checked, strip: els.optStrip.checked };
  log('info', 'Processing…');

  let out = currentSvg;
  const lines = [];
  let noFontFound = false;
  let anyMissing = false;
  let anyLocalFont = false;
  let embeddedCount = 0;
  const missingFamilies = new Set();

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
            clog('ok', `✓ Fontsource: ${families[i]} (${(r.bytes / 1024).toFixed(1)} KB)`);
          } else {
            missingFamilies.add(families[i]);
            clog('warn', `✗ Fontsource: ${families[i]} — not on CDN (commercial/proprietary?)`);
          }
        }

        // For each missing family, check faces against user-uploaded fonts
        if (missingFamilies.size) {
          const allFaces = extractFontFaces(out);

          // Auto-try Local Font Access API for faces not yet in userFonts
          await tryLocalFonts(allFaces, missingFamilies);

          for (const family of missingFamilies) {
            const familyFaces = allFaces.filter(f => f.family === family);
            const toCheck = familyFaces.length ? familyFaces : [{ family, weight: 400, style: 'normal' }];
            for (const face of toCheck) {
              const uf = userFonts.get(faceKey(face));
              if (uf) {
                fonts.push(uf);
                if (uf.source === 'local') {
                  anyLocalFont = true;
                  const kb = Math.round(uf.bytes / 1024);
                  lines.push(`  ✓ ${face.family} ${face.weight}${face.style !== 'normal' ? ' ' + face.style : ''} — system (${uf.cssFormat}, ${kb} KB)`);
                  clog('local', `✓ Local font: ${face.family} ${face.weight} (${uf.cssFormat}, ${kb} KB, source: ${uf.localFullName ?? 'system'})`);
                } else {
                  lines.push(`  ✓ ${face.family} ${face.weight}${face.style !== 'normal' ? ' ' + face.style : ''} — ${uf.fileName}`);
                  clog('ok', `✓ Uploaded: ${face.family} ${face.weight} — ${uf.fileName}`);
                }
              } else {
                anyMissing = true;
                lines.push(`  ✗ ${face.family} ${face.weight}${face.style !== 'normal' ? ' ' + face.style : ''} — not found`);
                clog('err', `✗ Missing: ${face.family} ${face.weight}${face.style !== 'normal' ? ' ' + face.style : ''} — upload a font file to embed it`);
              }
            }
          }
        }

        out = embedFontFaces(out, fonts);
        embeddedCount = fonts.length;
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
    els.afterMeta.innerHTML = describeAfter(out, embeddedCount, anyMissing);
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
      els.fontUploads.hidden = true;
    } else if (anyMissing || anyLocalFont) {
      els.report.innerHTML = '';
      const warn = document.createElement('span');
      warn.className = 'warn';

      let msg;
      if (anyLocalFont && !anyMissing) {
        msg =
          "Font not found on Fontsource CDN — loaded from your device instead.\n" +
          "Embedded as TrueType, which may be larger than .woff2.\n" +
          "Upload .woff2 files below to reduce output size:\n\n" +
          lines.join('\n');
      } else if (anyLocalFont && anyMissing) {
        msg =
          "Some fonts loaded from your device; others could not be found.\n" +
          "Upload .woff2 / .ttf / .otf files below for the missing faces:\n\n" +
          lines.join('\n');
      } else {
        let detectionNote = '';
        if (localFontCheckResult === 'notfound') {
          detectionNote = 'Checked your installed fonts — not found on this device.\n';
        } else if (localFontCheckResult === 'denied') {
          detectionNote = 'Local font detection was blocked by your browser.\n';
        }
        msg =
          'Font not on Fontsource (commercial/proprietary).\n' +
          detectionNote +
          'Upload a font file below to embed it:\n\n' +
          lines.join('\n');
      }

      warn.textContent = msg;
      els.report.appendChild(warn);
      buildUploadUI(currentSvg, missingFamilies);
    } else {
      log('ok', lines.join('\n'));
      els.fontUploads.hidden = true;
    }
  } catch (err) {
    if (runId !== myRunId) return;
    log('err', `Processing failed: ${err.message}`);
  }
}

/**
 * Build the per-face upload slot UI in #font-uploads.
 * Only shows faces whose family is in missingFamilies (Fontsource returned null).
 */
function buildUploadUI(svgText, missingFamilies) {
  const container = els.fontUploads;
  container.innerHTML = '';
  container.hidden = false;

  const faces = extractFontFaces(svgText).filter(f => missingFamilies.has(f.family));
  // Edge case: no faces extracted for a missing family — add a 400/normal placeholder
  for (const family of missingFamilies) {
    if (!faces.some(f => f.family === family)) {
      faces.push({ family, weight: 400, style: 'normal' });
    }
  }

  // Callout — honest about what we actually know
  const familyList = [...missingFamilies].join(', ');
  const foundLocally = localFontCheckResult === 'found';
  const callout = document.createElement('div');
  // When detection succeeded, flip the callout to a success/info style
  callout.className = foundLocally ? 'system-font-callout system-font-callout--found' : 'system-font-callout';

  let calloutIcon, calloutTitle, calloutBody;
  if (foundLocally) {
    calloutIcon = '✓';
    calloutTitle = `${escHtml(familyList)} detected on this device — embedded`;
    calloutBody =
      `The font was read from your system and embedded in the output SVG. ` +
      `It will display correctly for <em>everyone</em>, not just users who have it installed. ` +
      `The embedded format is TrueType, which may be larger than .woff2 — use "Replace" below to optimise.`;
  } else {
    calloutIcon = '⚠';
    calloutTitle = `${escHtml(familyList)} isn't on Fontsource — your preview may be misleading`;
    calloutBody =
      `If your preview looks correct, your browser is rendering it with your local copy of ` +
      `<em>${escHtml(familyList)}</em>. Other users who don't have it installed will see a ` +
      `different font. Upload the font file below to embed it in the SVG for everyone.`;
  }

  callout.innerHTML =
    `<div class="system-font-callout-icon">${calloutIcon}</div>` +
    `<div class="system-font-callout-body">` +
      `<strong>${calloutTitle}</strong>` +
      `<p>${calloutBody}</p>` +
      `<details class="system-font-os-guide">` +
        `<summary>How to temporarily disable it to verify</summary>` +
        `<ul>` +
          `<li><strong>macOS</strong> — Open <em>Font Book</em>, find the font, then choose <em>File › Disable Font</em>. Re-enable the same way when done.</li>` +
          `<li><strong>Windows</strong> — <em>Settings › Personalization › Fonts</em>, find the font, and uncheck "Show in the font list". Or open <em>Control Panel › Fonts</em> and right-click › Hide.</li>` +
          `<li><strong>Linux</strong> — Move the font file out of <code>~/.fonts/</code> or <code>/usr/share/fonts/</code>, then run <code>fc-cache -f</code>.</li>` +
        `</ul>` +
      `</details>` +
    `</div>`;
  container.appendChild(callout);

  // Offer Local Font Access detection (or retry) when fonts are still unresolved
  const hasUnresolved = faces.some(f => !userFonts.has(faceKey(f)));
  if (!('queryLocalFonts' in window) && hasUnresolved) {
    // Non-Chromium browser — explain the feature exists in Chrome/Edge
    const hint = document.createElement('p');
    hint.className = 'detect-local-browser-hint';
    hint.innerHTML =
      `Using <strong>Chrome or Edge</strong>? We can automatically detect and embed this font ` +
      `if it's installed on your device. ` +
      `<a href="https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API#browser_compatibility" ` +
         `target="_blank" rel="noopener">Firefox and Safari don't yet support this API.</a>`;
    container.appendChild(hint);
  } else if ('queryLocalFonts' in window && hasUnresolved && !foundLocally) {
    const detectRow = document.createElement('div');
    detectRow.className = 'detect-local-row';

    const detectBtn = document.createElement('button');
    detectBtn.className = 'detect-local-btn';
    const isRetry = localFontCheckResult === 'denied' || localFontCheckResult === 'notfound';
    detectBtn.textContent = isRetry ? '↺ Retry font detection' : '🔍 Detect installed fonts';
    if (localFontCheckResult === 'denied') {
      detectBtn.title = 'Permission was blocked — allow "Local fonts" in your browser site settings, then retry';
    }

    detectBtn.addEventListener('click', async () => {
      detectBtn.disabled = true;
      detectBtn.textContent = 'Checking…';
      // Prompt is a subtle URL-bar popup — tell the user to look for it
      detectNote.textContent = "👆 Look for a permission prompt in your browser's address bar";
      detectNote.style.color = '#fcd34d';
      localFontCheckResult = null;
      const allFaces = extractFontFaces(currentSvg).filter(f => missingFamilies.has(f.family));
      await tryLocalFonts(allFaces, missingFamilies);
      if (localFontCheckResult === 'found') {
        // Success — let process() rebuild with the green callout
        process();
      } else if (localFontCheckResult === 'denied') {
        detectBtn.textContent = '↺ Retry';
        detectBtn.disabled = false;
        detectNote.textContent = '🚫 Permission blocked — click the 🔒 icon in your address bar and allow "Local fonts", then retry';
        detectNote.style.color = '#f87171';
      } else {
        // notfound
        detectBtn.textContent = '↺ Retry';
        detectBtn.disabled = false;
        detectNote.textContent = `Font not found on this device. Upload a file below.`;
        detectNote.style.color = 'rgba(255,255,255,.45)';
      }
    });

    const detectNote = document.createElement('span');
    detectNote.className = 'detect-local-note';
    detectNote.textContent = localFontCheckResult === 'denied'
      ? 'Blocked — allow in browser site settings first'
      : 'Chrome / Edge only · requires permission';
    detectRow.append(detectBtn, detectNote);
    container.appendChild(detectRow);
  }

  for (const face of faces) {
    const key = faceKey(face);
    const uploaded = userFonts.get(key);
    const weightLabel = face.weight === 400 ? 'Regular' : face.weight === 700 ? 'Bold' : String(face.weight);
    const styleLabel = face.style !== 'normal' ? ` ${face.style}` : '';
    const faceLabel = `${face.family} ${weightLabel}${styleLabel}`;

    const row = document.createElement('div');
    row.className = 'upload-face-row';

    const label = document.createElement('span');
    label.className = 'upload-face-label';

    if (uploaded?.source === 'local') {
      const kb = Math.round(uploaded.bytes / 1024);
      label.innerHTML =
        `<span class="face-local">✓</span> ${escHtml(faceLabel)} ` +
        `<span class="face-local-note">· system font · ${uploaded.cssFormat} · ${kb} KB</span>`;
      const replaceBtn = document.createElement('button');
      replaceBtn.className = 'upload-face-replace';
      replaceBtn.title = 'Replace system font with your own .woff2 for smaller output';
      replaceBtn.textContent = 'Replace with .woff2';
      replaceBtn.addEventListener('click', () => triggerFontUpload(face));
      row.append(label, replaceBtn);
    } else if (uploaded) {
      label.innerHTML = `<span class="face-ok">✓</span> ${escHtml(faceLabel)} <span style="opacity:.5">· ${escHtml(uploaded.fileName)}</span>`;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'upload-face-remove';
      removeBtn.title = 'Remove uploaded font';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        userFonts.delete(key);
        process();
      });
      row.append(label, removeBtn);
    } else {
      label.innerHTML = `<span class="face-miss">✗</span> ${escHtml(faceLabel)}`;
      const uploadBtn = document.createElement('button');
      uploadBtn.className = 'upload-face-btn';
      uploadBtn.textContent = 'Upload font';
      uploadBtn.addEventListener('click', () => triggerFontUpload(face));
      row.append(label, uploadBtn);
    }

    container.appendChild(row);
  }

  const note = document.createElement('div');
  note.className = 'upload-license-note';
  note.textContent = 'Only embed fonts if your license permits. SVGOMG-Font does not verify font rights.';
  container.appendChild(note);
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Open a file picker for a specific font face, read the file, validate it,
 * store it in userFonts, then re-run process().
 */
function triggerFontUpload(face) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.woff2,.ttf,.otf,.woff';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const fontObj = await readFontFile(file, face);
      userFonts.set(faceKey(face), fontObj);
      process();
    } catch (err) {
      log('err', `Font upload failed: ${err.message}`);
    }
  });
  input.click();
}

const FONT_SIGS = {
  woff2:    { magic: [0x77, 0x4F, 0x46, 0x32], mime: 'font/woff2',    css: 'woff2' },
  woff:     { magic: [0x77, 0x4F, 0x46, 0x46], mime: 'font/woff',     css: 'woff' },
  otf:      { magic: [0x4F, 0x54, 0x54, 0x4F], mime: 'font/opentype', css: 'opentype' },
  ttf:      { magic: [0x00, 0x01, 0x00, 0x00], mime: 'font/truetype', css: 'truetype' },
  ttf_true: { magic: [0x74, 0x72, 0x75, 0x65], mime: 'font/truetype', css: 'truetype' },
};

function bufferToFontObject(buf, face, fileName) {
  if (buf.length < 4) throw new Error('Font data is too small to be a valid font.');

  let mimeType, cssFormat;
  for (const sig of Object.values(FONT_SIGS)) {
    if (sig.magic.every((b, i) => buf[i] === b)) {
      mimeType = sig.mime;
      cssFormat = sig.css;
      break;
    }
  }
  if (!mimeType) throw new Error('Unrecognised font format (expected woff2/woff/ttf/otf).');

  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }

  return {
    family: face.family,
    weight: face.weight,
    style: face.style,
    mimeType,
    cssFormat,
    base64: btoa(bin),
    bytes: buf.length,
    fileName,
  };
}

async function readFontFile(file, face) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const obj = bufferToFontObject(buf, face, file.name);
  const kb = Math.round(buf.length / 1024);
  if (obj.cssFormat !== 'woff2' && kb > 200) {
    console.warn(`[svgomg-font] ${file.name} is ${kb} KB as ${obj.cssFormat}. Consider .woff2 for smaller output.`);
  }
  return obj;
}

function parseLocalFontStyle(styleStr) {
  const s = styleStr.toLowerCase();
  const isItalic = s.includes('italic') || s.includes('oblique');
  let weight = 400;
  if (s.includes('thin')) weight = 100;
  else if (s.includes('extralight') || s.includes('extra light') || s.includes('ultralight')) weight = 200;
  else if (s.includes('light')) weight = 300;
  else if (s.includes('medium')) weight = 500;
  else if (s.includes('semibold') || s.includes('semi bold') || s.includes('demibold')) weight = 600;
  else if (s.includes('extrabold') || s.includes('extra bold') || s.includes('ultrabold')) weight = 800;
  else if (s.includes('black') || s.includes('heavy')) weight = 900;
  else if (s.includes('bold')) weight = 700;
  return { weight, style: isItalic ? 'italic' : 'normal' };
}

/**
 * Try the Local Font Access API to auto-resolve missing font faces.
 * Stores found fonts in userFonts with source:'local'.
 * Sets localFontCheckResult so the UI can explain what happened.
 */
async function tryLocalFonts(allFaces, missingFamilies) {
  if (!('queryLocalFonts' in window)) {
    if (localFontCheckResult === null) localFontCheckResult = 'unavailable';
    return;
  }

  // Don't re-query if we already have a definitive result — avoids repeated
  // permission prompts or slow font-list reads on every process() call.
  if (localFontCheckResult === 'denied' || localFontCheckResult === 'notfound') return;

  const toResolve = allFaces.filter(
    f => missingFamilies.has(f.family) && !userFonts.has(faceKey(f))
  );
  if (!toResolve.length) return;

  let localFontList;
  try {
    localFontList = await window.queryLocalFonts();
  } catch {
    localFontCheckResult = 'denied';
    return;
  }

  // Debug: log what the API actually returned for matching families
  const wantedFamilies = new Set(toResolve.map(f => f.family.toLowerCase()));
  const allFamilies = [...new Set(localFontList.map(f => f.family))].sort();
  clog('local', `queryLocalFonts() → ${localFontList.length} fonts on device`);
  clog('local', `Looking for: ${[...wantedFamilies].join(', ')}`);
  const partialMatches = allFamilies.filter(fam =>
    [...wantedFamilies].some(w => fam.toLowerCase().includes(w) || w.includes(fam.toLowerCase()))
  );
  if (partialMatches.length) {
    clog('local', `Closest family name matches: ${partialMatches.join(', ')}`);
  } else {
    clog('warn', `No family name match found. First 30 families:`, allFamilies.slice(0, 30).join(', '));
  }

  let foundAny = false;
  for (const face of toResolve) {
    const candidates = localFontList.filter(
      f => f.family.toLowerCase() === face.family.toLowerCase()
    );
    if (!candidates.length) continue;

    // Prefer exact weight+style match, then weight match, then any face
    const match =
      candidates.find(f => {
        const p = parseLocalFontStyle(f.style);
        return p.weight === face.weight && p.style === face.style;
      }) ||
      candidates.find(f => parseLocalFontStyle(f.style).weight === face.weight) ||
      candidates[0];

    try {
      const blob = await match.blob();
      const buf = new Uint8Array(await blob.arrayBuffer());
      const fontObj = bufferToFontObject(buf, face, match.fullName);
      fontObj.source = 'local';
      fontObj.localFullName = match.fullName;
      userFonts.set(faceKey(face), fontObj);
      foundAny = true;
    } catch {
      // skip this face — manual upload still available
    }
  }
  localFontCheckResult = foundAny ? 'found' : 'notfound';
}

function renderInto(node, text) {
  // Render via an <img> so any @font-face rules in <style> are exercised
  // the same way the SVG would be when used as an image elsewhere.
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  node.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'zoom-wrap';
  const img = document.createElement('img');
  img.src = url;
  img.onload = () => URL.revokeObjectURL(url);
  wrap.appendChild(img);
  node.appendChild(wrap);
  applySvgTransform();
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
