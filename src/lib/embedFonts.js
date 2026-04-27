/**
 * Inject @font-face rules into the SVG's <style> block, or create one if missing.
 */
export function embedFontFaces(svgText, fonts) {
  if (!fonts.length) return svgText;

  const rules = fonts
    .map(
      (f) =>
        `@font-face{font-family:'${cssEscape(f.family)}';font-style:${f.italic ? 'italic' : 'normal'};font-weight:${f.weight};src:url(data:font/woff2;base64,${f.base64}) format('woff2');}`,
    )
    .join('');

  // Existing <style><![CDATA[...]]></style>
  if (/<style[^>]*><!\[CDATA\[/.test(svgText)) {
    return svgText.replace(/(<style[^>]*><!\[CDATA\[)/, `$1${rules}`);
  }
  // Existing <style>...</style> (no CDATA)
  if (/<style[^>]*>/.test(svgText)) {
    return svgText.replace(/(<style[^>]*>)/, `$1${rules}`);
  }
  // No <style> — insert one right after the opening <svg ...>
  return svgText.replace(/(<svg\b[^>]*>)/, `$1<style>${rules}</style>`);
}

function cssEscape(s) {
  return s.replace(/'/g, "\\'");
}
