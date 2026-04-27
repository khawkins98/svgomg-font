/**
 * SVGO browser pass — lazy-loaded so a bundling hiccup doesn't break the page.
 *
 * SVGO ships a browser entry (`svgo/browser`) since v3. We disable plugins that
 * would shred fonts/text:
 *   - inlineStyles: would tear apart the @font-face rules we just injected
 *   - minifyStyles: turns base64 data URIs into garbage in some versions
 */
let optimizeFn = null;

async function loadSvgo() {
  if (optimizeFn) return optimizeFn;
  // SVGO 3.x has no `exports` field, so we point at the prebuilt browser bundle directly.
  const mod = await import('svgo/dist/svgo.browser.js');
  optimizeFn = mod.optimize;
  return optimizeFn;
}

export async function svgoPass(svgText) {
  const optimize = await loadSvgo();
  const result = optimize(svgText, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            inlineStyles: false,
            minifyStyles: false,
            removeViewBox: false,
            cleanupIds: false,
          },
        },
      },
    ],
  });
  return result.data;
}
