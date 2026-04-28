/**
 * Find every distinct font-family used in an SVG.
 * Looks at:
 *   - inline `font-family="..."` attributes
 *   - `<style>` blocks with `font-family: ...` declarations
 *   - inline `style="font-family: ..."` attributes
 *
 * Returns family names with surrounding quotes and whitespace stripped.
 */
export function extractFontFamilies(svgText) {
  const families = new Set();

  // Stop at `;`, `}`, `{`, quotes, or angle brackets — these all terminate a value
  // in either CSS rules or SVG attribute syntax. Without `}`, compact rules like
  // `.l{font-family:Roboto-Bold}.m{font-family:Roboto-Regular}` get captured as one
  // monster value.
  for (const m of svgText.matchAll(/font-family\s*[:=]\s*(["']?)([^;"'<>{}]+)\1/g)) {
    const raw = m[2].trim();
    for (const name of raw.split(',')) {
      const clean = name.trim().replace(/^["']|["']$/g, '');
      if (clean && !isGenericFamily(clean)) families.add(clean);
    }
  }

  return [...families];
}

// ---------------------------------------------------------------------------
// Face extraction — family + weight + style tuples
// ---------------------------------------------------------------------------

const WEIGHT_MAP = {
  thin: 100, extralight: 200, ultralight: 200, light: 300,
  regular: 400, normal: 400, medium: 500,
  semibold: 600, demibold: 600, bold: 700,
  extrabold: 800, ultrabold: 800, black: 900, heavy: 900,
};

function normalizeWeight(raw) {
  if (raw == null) return 400;
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '');
  const n = parseInt(s, 10);
  if (!isNaN(n)) return n;
  return WEIGHT_MAP[s] ?? 400;
}

function normalizeStyle(raw) {
  const v = String(raw ?? '').trim().toLowerCase();
  return v === 'italic' || v === 'oblique' ? v : 'normal';
}

function addFace(faces, rawFamily, weight, style) {
  // Take only the first non-generic family from a stack
  for (const part of rawFamily.split(',')) {
    const fam = part.trim().replace(/^["']|["']$/g, '').trim();
    if (fam && !isGenericFamily(fam)) {
      const w = normalizeWeight(weight);
      const s = normalizeStyle(style);
      const key = `${fam}|${w}|${s}`;
      if (!faces.has(key)) faces.set(key, { family: fam, weight: w, style: s });
      break;
    }
  }
}

/**
 * Extract every distinct font face (family + weight + style) referenced in the SVG.
 * Unlike extractFontFamilies, this captures weight/style from context so we know
 * exactly which face file to request from the user when auto-lookup fails.
 */
export function extractFontFaces(svgText) {
  const faces = new Map();

  // 1. CSS rule blocks { ... }
  for (const m of svgText.matchAll(/\{([^}]*)\}/g)) {
    const block = m[1];
    const fm = block.match(/font-family\s*:\s*(["']?)([^;"'{}]+?)\1\s*(?:[;}"',]|$)/);
    if (!fm) continue;
    const wm = block.match(/font-weight\s*:\s*([^;"'{}\s][^;"'{}]*)/);
    const sm = block.match(/font-style\s*:\s*([^;"'{}\s][^;"'{}]*)/);
    addFace(faces, fm[2].trim(), wm?.[1]?.trim(), sm?.[1]?.trim());
  }

  // 2. font-family="..." attribute on SVG elements (with optional weight/style attrs)
  for (const m of svgText.matchAll(/<[a-zA-Z:][^>]*?font-family\s*=\s*(["'])([^"']+)\1[^>]*?(?:>|\/?>)/gs)) {
    const el = m[0];
    const wm = el.match(/font-weight\s*=\s*(["'])([^"']+)\1/);
    const sm = el.match(/font-style\s*=\s*(["'])([^"']+)\1/);
    addFace(faces, m[2], wm?.[2], sm?.[2]);
  }

  // 3. Inline style="..." attributes
  for (const m of svgText.matchAll(/style\s*=\s*(["'])([^"']+)\1/g)) {
    const block = m[2];
    const fm = block.match(/font-family\s*:\s*(["']?)([^;"']+?)\1\s*(?:[;"',]|$)/);
    if (!fm) continue;
    const wm = block.match(/font-weight\s*:\s*([^;"'\s][^;"']*)/);
    const sm = block.match(/font-style\s*:\s*([^;"'\s][^;"']*)/);
    addFace(faces, fm[2].trim(), wm?.[1]?.trim(), sm?.[1]?.trim());
  }

  return [...faces.values()];
}

function isGenericFamily(name) {
  return ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-monospace'].includes(
    name.toLowerCase(),
  );
}

/**
 * Detect deprecated SVG `<font>` glyph blocks. These are not rendered by any
 * modern browser and are usually the reason text shows as fallback or invisible.
 */
export function hasDeprecatedSvgFonts(svgText) {
  return /<font[\s>]/.test(svgText);
}

export function stripDeprecatedSvgFonts(svgText) {
  return svgText.replace(/<font [^>]*>[\s\S]*?<\/font>/g, '').replace(/<font\/>/g, '');
}
