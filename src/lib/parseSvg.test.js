import { describe, it, expect } from 'vitest';
import {
  extractFontFamilies,
  extractFontFaces,
  hasDeprecatedSvgFonts,
  stripDeprecatedSvgFonts,
} from './parseSvg.js';

describe('extractFontFamilies', () => {
  it('finds families in inline attributes', () => {
    const svg = `<svg><text font-family="Roboto">Hi</text></svg>`;
    expect(extractFontFamilies(svg)).toEqual(['Roboto']);
  });

  it('finds families in <style> blocks', () => {
    const svg = `<svg><style>.a { font-family: Inter; }</style><text class="a">Hi</text></svg>`;
    expect(extractFontFamilies(svg)).toEqual(['Inter']);
  });

  // LEARNINGS.md: minified CSS with `{}` boundaries used to be captured as one
  // giant family name. The `{}` characters must be in the negated set.
  it('stops at rule boundaries in compact CSS (LEARNINGS.md)', () => {
    const svg = `<svg><style>.l{font-family:Roboto-Bold}.m{font-family:Roboto-Regular}.n{fill:#2d2d2d}</style></svg>`;
    const families = extractFontFamilies(svg);
    expect(families).toContain('Roboto-Bold');
    expect(families).toContain('Roboto-Regular');
    // Regression: must not swallow the rule boundary
    expect(families.some(f => f.includes('}'))).toBe(false);
    expect(families.some(f => f.includes('{'))).toBe(false);
  });

  it('splits comma-separated font stacks and drops generics', () => {
    // Real editors emit stacks without inner quotes on the SVG attribute
    // side (Figma/Illustrator/Inkscape). CSS blocks may re-quote members;
    // that path is exercised via the <style> block below.
    const svg = `<svg><text font-family="Open Sans, Arial, sans-serif">Hi</text></svg>`;
    const families = extractFontFamilies(svg);
    expect(families).toContain('Open Sans');
    expect(families).toContain('Arial');
    expect(families).not.toContain('sans-serif');
  });

  it('deduplicates repeated families', () => {
    const svg = `<svg>
      <text font-family="Roboto">a</text>
      <text font-family="Roboto">b</text>
    </svg>`;
    expect(extractFontFamilies(svg)).toEqual(['Roboto']);
  });

  it('strips wrapping quotes from CSS values via backreference', () => {
    // <style> block: family value is quoted inside the CSS rule. The regex's
    // `\1` backreference matches the closing quote so the captured group
    // never contains the delimiters.
    const svg = `<svg><style>.h { font-family: "Playfair Display"; }</style></svg>`;
    expect(extractFontFamilies(svg)).toEqual(['Playfair Display']);
  });
});

describe('extractFontFaces', () => {
  it('captures family + weight from a style block', () => {
    const svg = `<svg><style>.h { font-family: Inter; font-weight: 700; }</style></svg>`;
    expect(extractFontFaces(svg)).toEqual([
      { family: 'Inter', weight: 700, style: 'normal' },
    ]);
  });

  it('maps keyword weights to numeric', () => {
    const svg = `<svg><style>.b { font-family: Inter; font-weight: bold; }</style></svg>`;
    expect(extractFontFaces(svg)[0].weight).toBe(700);
  });

  it('captures italic style from attributes', () => {
    const svg = `<svg><text font-family="Inter" font-style="italic">Hi</text></svg>`;
    expect(extractFontFaces(svg)[0].style).toBe('italic');
  });

  it('defaults missing weight to 400', () => {
    const svg = `<svg><text font-family="Inter">Hi</text></svg>`;
    expect(extractFontFaces(svg)[0].weight).toBe(400);
  });

  it('deduplicates the same face across sources', () => {
    const svg = `<svg>
      <style>.a { font-family: Inter; font-weight: 700; }</style>
      <text font-family="Inter" font-weight="700">Hi</text>
    </svg>`;
    expect(extractFontFaces(svg)).toHaveLength(1);
  });
});

describe('deprecated <font> block handling', () => {
  it('detects a <font> block', () => {
    const svg = `<svg><font id="fnt"><font-face font-family="X"/><glyph unicode="a" d="M0,0"/></font></svg>`;
    expect(hasDeprecatedSvgFonts(svg)).toBe(true);
  });

  it('does not confuse font-family attributes for <font> blocks', () => {
    const svg = `<svg><text font-family="Roboto">Hi</text></svg>`;
    expect(hasDeprecatedSvgFonts(svg)).toBe(false);
  });

  it('strips <font>...</font> blocks whole', () => {
    const svg = `<svg><font id="x"><glyph/></font><text>keep</text></svg>`;
    const stripped = stripDeprecatedSvgFonts(svg);
    expect(stripped).not.toContain('<font');
    expect(stripped).toContain('keep');
  });

  it('strips self-closing <font/>', () => {
    const svg = `<svg><font/><text>keep</text></svg>`;
    expect(stripDeprecatedSvgFonts(svg)).not.toContain('<font');
  });
});
