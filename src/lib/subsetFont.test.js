import { describe, it, expect } from 'vitest';
import { extractUsedCodepoints } from './subsetFont.js';

// vite.config.js sets test.environment: 'happy-dom' so DOMParser is
// available. If that changes, these tests will fail loudly rather than
// trivially pass.

const BASIC_LATIN_COUNT = 0x7e - 0x20 + 1;

describe('extractUsedCodepoints', () => {
  it('includes the Basic Latin baseline (U+0020..U+007E)', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"></svg>`;
    const cps = extractUsedCodepoints(svg);
    expect(cps.size).toBe(BASIC_LATIN_COUNT);
    for (let cp = 0x20; cp <= 0x7e; cp++) {
      expect(cps.has(cp)).toBe(true);
    }
  });

  it('picks up characters from <text> elements', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text>Héllo</text></svg>`;
    const cps = extractUsedCodepoints(svg);
    expect(cps.has(0x00e9)).toBe(true); // é
    // baseline + é
    expect(cps.size).toBe(BASIC_LATIN_COUNT + 1);
  });

  it('picks up characters from <tspan> children', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text>a<tspan>β</tspan></text></svg>`;
    const cps = extractUsedCodepoints(svg);
    expect(cps.has('β'.codePointAt(0))).toBe(true);
  });

  it('handles supplementary-plane characters (U+10000+)', () => {
    // U+1F600 GRINNING FACE — outside the BMP, surrogate pair in JS
    // strings but codePointAt returns the actual codepoint.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text>😀</text></svg>`;
    const cps = extractUsedCodepoints(svg);
    expect(cps.has(0x1f600)).toBe(true);
  });

  it('ignores text in non-text-bearing elements', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><style>font-family: Roboto</style></svg>`;
    const cps = extractUsedCodepoints(svg);
    expect(cps.size).toBe(BASIC_LATIN_COUNT);
  });

  it('dedupes across multiple text elements', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <text>éé</text>
      <text>é</text>
    </svg>`;
    const cps = extractUsedCodepoints(svg);
    expect(cps.size).toBe(BASIC_LATIN_COUNT + 1);
  });
});
