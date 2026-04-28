/**
 * Inject @font-face rules into the SVG's <style> block, or create one if missing.
 * Font objects may come from Fontsource (have `italic` boolean) or from user uploads
 * (have `style` string, `mimeType`, `cssFormat`).
 */
export function embedFontFaces(svgText, fonts) {
  if (!fonts.length) return svgText;

  const rules = fonts
    .map((f) => {
      const fontStyle = f.style ?? (f.italic ? 'italic' : 'normal');
      const mime = f.mimeType ?? 'font/woff2';
      const fmt = f.cssFormat ?? 'woff2';
      return `@font-face{font-family:'${cssEscape(f.family)}';font-style:${fontStyle};font-weight:${f.weight};src:url(data:${mime};base64,${f.base64}) format('${fmt}');}`;
    })
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
