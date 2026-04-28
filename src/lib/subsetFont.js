/**
 * Font glyph subsetting for the browser.
 *
 * Pipeline:
 *   1. If input is woff2 → decompress to TTF via wawoff2
 *   2. Subset TTF with harfbuzz hb-subset.wasm (only keeps requested codepoints)
 *   3. Re-compress result to woff2 via wawoff2
 *
 * Falls back to the original fontObj silently on any error.
 */

import decompress from 'wawoff2/decompress';
import compress   from 'wawoff2/compress';
import hbSubsetWasmUrl from 'harfbuzzjs/hb-subset.wasm?url';

// HarfBuzz WASM exports — initialised once on first use
let _hb = null;

async function getHb() {
  if (_hb) return _hb;
  const response = await fetch(hbSubsetWasmUrl);
  const bytes = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes);
  _hb = instance.exports;
  return _hb;
}

/**
 * Extract all Unicode codepoints used in text-bearing SVG elements, plus
 * the full Basic Latin block (U+0020–U+007E) as a safety baseline.
 *
 * @param {string} svgText
 * @returns {Set<number>}
 */
export function extractUsedCodepoints(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const chars = new Set();

  for (const el of doc.querySelectorAll('text, tspan, textPath, title, desc')) {
    for (const ch of el.textContent) {
      chars.add(ch.codePointAt(0));
    }
  }

  // Always keep Basic Latin so the font is usable even if the SVG text
  // content is dynamically replaced or partially mis-parsed.
  for (let cp = 0x20; cp <= 0x7e; cp++) chars.add(cp);

  return chars;
}

/**
 * Detect the output format from the first 4 magic bytes.
 * @param {Uint8Array} bytes
 * @returns {{ mime: string, css: string } | null}
 */
function detectFormat(bytes) {
  if (bytes.length < 4) return null;
  const [a, b, c, d] = bytes;
  if (a === 0x77 && b === 0x4f && c === 0x46 && d === 0x32) return { mime: 'font/woff2',    css: 'woff2'     };
  if (a === 0x77 && b === 0x4f && c === 0x46 && d === 0x46) return { mime: 'font/woff',     css: 'woff'      };
  if (a === 0x4f && b === 0x54 && c === 0x54 && d === 0x4f) return { mime: 'font/opentype', css: 'opentype'  };
  if ((a === 0x00 && b === 0x01 && c === 0x00 && d === 0x00) ||
      (a === 0x74 && b === 0x72 && c === 0x75 && d === 0x65)) return { mime: 'font/truetype', css: 'truetype' };
  return null;
}

/**
 * Run HarfBuzz hb_subset on a TTF/OTF Uint8Array.
 * @param {Uint8Array} ttfBytes
 * @param {Iterable<number>} codepoints
 * @returns {Promise<Uint8Array>} subsetted TTF bytes
 */
async function hbSubset(ttfBytes, codepoints) {
  const hb = await getHb();

  const fontPtr = hb.malloc(ttfBytes.byteLength);
  new Uint8Array(hb.memory.buffer).set(ttfBytes, fontPtr);

  const blob  = hb.hb_blob_create(fontPtr, ttfBytes.byteLength, 2 /* HB_MEMORY_MODE_WRITABLE */, 0, 0);
  const face  = hb.hb_face_create(blob, 0);
  hb.hb_blob_destroy(blob);

  const input      = hb.hb_subset_input_create_or_fail();
  const unicodeSet = hb.hb_subset_input_unicode_set(input);
  for (const cp of codepoints) hb.hb_set_add(unicodeSet, cp);

  const subsetFace = hb.hb_subset_or_fail(face, input);
  hb.hb_subset_input_destroy(input);
  hb.hb_face_destroy(face);
  hb.free(fontPtr);

  if (!subsetFace) throw new Error('hb_subset_or_fail returned zero');

  const resultBlob = hb.hb_face_reference_blob(subsetFace);
  const offset     = hb.hb_blob_get_data(resultBlob, 0);
  const length     = hb.hb_blob_get_length(resultBlob);

  if (!length) {
    hb.hb_blob_destroy(resultBlob);
    hb.hb_face_destroy(subsetFace);
    throw new Error('hb_subset produced empty output');
  }

  // Slice *before* further WASM calls that could grow memory (and thus
  // replace the backing ArrayBuffer reference in hb.memory.buffer).
  const result = new Uint8Array(hb.memory.buffer).slice(offset, offset + length);

  hb.hb_blob_destroy(resultBlob);
  hb.hb_face_destroy(subsetFace);

  return result;
}

/**
 * Convert a base64 string to a Uint8Array.
 * @param {string} b64
 * @returns {Uint8Array}
 */
function b64ToBytes(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

/**
 * Convert a Uint8Array to a base64 string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToB64(bytes) {
  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/**
 * Attempt to subset `fontObj` to only the given Unicode `codepoints`.
 *
 * Returns a *new* fontObj with updated `base64`, `bytes`, `mimeType`, and
 * `cssFormat`.  If subsetting fails (or the result is larger), returns the
 * original fontObj unchanged so the caller always gets a valid font.
 *
 * The `originalBytes` property on the return value is set when subsetting
 * succeeded, allowing callers to display the before/after sizes.
 *
 * @param {object} fontObj
 * @param {Set<number>} codepoints
 * @returns {Promise<object>}
 */
export async function subsetFontIfPossible(fontObj, codepoints) {
  try {
    let fontBytes = b64ToBytes(fontObj.base64);

    // Detect the input format from magic bytes
    const inputFmt = detectFormat(fontBytes);
    const isWoff2  = inputFmt?.css === 'woff2';

    // HarfBuzz's hb-subset.wasm reads TTF/OTF only — decompress woff2 first.
    if (isWoff2) {
      fontBytes = await decompress(fontBytes);
    }

    // Subset
    const subsetTtf = await hbSubset(fontBytes, codepoints);

    // Re-compress to woff2 for the smallest possible embedded size.
    const subsetWoff2 = await compress(subsetTtf);

    // Only use the subset if it's actually smaller than the original.
    if (subsetWoff2.length >= fontObj.bytes) return fontObj;

    return {
      ...fontObj,
      base64:    bytesToB64(subsetWoff2),
      bytes:     subsetWoff2.length,
      mimeType:  'font/woff2',
      cssFormat: 'woff2',
      originalBytes: fontObj.bytes,
    };
  } catch (e) {
    console.warn('[svgomg-font] subsetting failed, using full font:', e.message);
    return fontObj;
  }
}
