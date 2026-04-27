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
