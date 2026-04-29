/**
 * Font glyph subsetting for the browser.
 *
 * Uses fontkit which parses TTF, OTF, WOFF, and WOFF2 natively and produces
 * a subsetted font containing only the requested codepoints.
 *
 * fontkit is loaded lazily on first call so it doesn't bloat the initial bundle.
 *
 * Falls back to the original fontObj silently on any error.
 */

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
 * Convert a base64 string to a Buffer (Node-compatible Uint8Array).
 */
function b64ToBuffer(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

/**
 * Convert a Uint8Array / Buffer to a base64 string.
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
    const { create: fontkitCreate } = await import('fontkit');
    const fontBuffer = b64ToBuffer(fontObj.base64);

    // fontkit.create() accepts a Buffer/Uint8Array and handles
    // TTF, OTF, WOFF, and WOFF2 formats natively.
    const font = fontkitCreate(fontBuffer);
    const subset = font.createSubset();

    for (const cp of codepoints) {
      const glyph = font.glyphForCodePoint(cp);
      if (glyph) subset.includeGlyph(glyph);
    }

    const subsetBytes = new Uint8Array(subset.encode());

    // Only use the subset if it's actually smaller than the original.
    if (subsetBytes.length >= fontObj.bytes) return fontObj;

    return {
      ...fontObj,
      base64:    bytesToB64(subsetBytes),
      bytes:     subsetBytes.length,
      // fontkit encodes subsets as TTF/sfnt
      mimeType:  'font/truetype',
      cssFormat: 'truetype',
      originalBytes: fontObj.bytes,
    };
  } catch (e) {
    console.warn('[svgomg-font] subsetting failed, using full font:', e.message);
    return fontObj;
  }
}
