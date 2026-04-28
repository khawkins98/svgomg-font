/**
 * Resolve a font-family name to a base64 woff2 string.
 *
 * Strategy: Fontsource via jsDelivr. Fontsource serves static-weight woff2 files
 * at predictable URLs, which sidesteps Google Fonts' variable-font weirdness.
 *
 * If a name carries a weight hint (e.g. "Roboto-Bold", "Roboto Bold", "OpenSans-SemiBold"),
 * we fetch that weight. Otherwise we fetch 400.
 *
 * The returned `family` is what we'll declare in @font-face — by default we keep
 * the original name so existing CSS class lookups still match.
 */

const WEIGHT_KEYWORDS = {
  thin: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

export function parseFamily(name) {
  // "Roboto-Bold" or "Roboto Bold" → base "Roboto", weight 700
  let weight = 400;
  let base = name;
  let italic = false;

  const tokens = name.split(/[-_ ]+/);
  if (tokens.length > 1) {
    const last = tokens[tokens.length - 1].toLowerCase();
    if (last === 'italic' || last === 'oblique') {
      italic = true;
      tokens.pop();
    }
  }
  if (tokens.length > 1) {
    // Strip PostScript suffixes (always uppercase: PSMT, MT, PS) before weight lookup
    // so "BoldMT" is recognised as "Bold", "BoldPS" as "Bold", etc.
    const rawLast = tokens[tokens.length - 1];
    const cleanLast = rawLast.replace(/PSMT$|MT$|PS$/, '').toLowerCase();
    if (WEIGHT_KEYWORDS[cleanLast] !== undefined) {
      weight = WEIGHT_KEYWORDS[cleanLast];
      tokens.pop();
    }
  }
  if (tokens.length !== name.split(/[-_ ]+/).length) {
    base = tokens.join(' ');
  }

  return { base, weight, italic };
}

/**
 * Normalise a PostScript-style font name to a human-readable family name.
 * "CourierNewPSMT"  → "Courier New"
 * "HelveticaNeue"   → "Helvetica Neue"
 * "TimesNewRoman"   → "Times New Roman"
 */
export function normalizePostScriptName(name) {
  // Strip uppercase PostScript suffixes (PSMT, MT, PS) — they're always uppercase
  const stripped = name.replace(/PSMT$|MT$|PS$/, '');
  // Split CamelCase words and trim any stray spaces
  return stripped.replace(/([A-Z][a-z]+)/g, ' $1').trim().replace(/\s+/g, ' ');
}

function fontsourceSlug(base) {
  return base.toLowerCase().replace(/\s+/g, '-');
}

async function tryFetchWoff2(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  // Sanity check: woff2 files start with 0x77 0x4F 0x46 0x32 ("wOF2")
  if (buf.length < 4 || buf[0] !== 0x77 || buf[1] !== 0x4f || buf[2] !== 0x46 || buf[3] !== 0x32) {
    return null;
  }
  return buf;
}

function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * @param {string} fullName  - e.g. "Roboto-Bold" or "Open Sans"
 * @returns {Promise<{family: string, weight: number, italic: boolean, base64: string} | null>}
 */
export async function fetchFontAsBase64(fullName) {
  const { base, weight, italic } = parseFamily(fullName);
  const slug = fontsourceSlug(base);
  const style = italic ? 'italic' : 'normal';

  const candidates = [
    `https://cdn.jsdelivr.net/npm/@fontsource/${slug}/files/${slug}-latin-${weight}-${style}.woff2`,
    `https://cdn.jsdelivr.net/npm/@fontsource/${slug}/files/${slug}-latin-ext-${weight}-${style}.woff2`,
  ];

  for (const url of candidates) {
    const bytes = await tryFetchWoff2(url);
    if (bytes) {
      return {
        family: fullName, // preserve original name so existing CSS still matches
        weight,
        italic,
        base64: toBase64(bytes),
        bytes: bytes.length,
        sourceUrl: url,
      };
    }
  }
  return null;
}
