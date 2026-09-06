import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseFamily,
  normalizePostScriptName,
  fetchFontAsBase64,
} from './fetchFont.js';

describe('parseFamily', () => {
  it('parses a bare family name to weight 400 and flags it as inferred', () => {
    expect(parseFamily('Roboto')).toEqual({
      base: 'Roboto', weight: 400, italic: false, weightExplicit: false,
    });
  });

  it('parses hyphenated weight suffixes', () => {
    expect(parseFamily('Roboto-Bold')).toEqual({
      base: 'Roboto', weight: 700, italic: false, weightExplicit: true,
    });
    expect(parseFamily('OpenSans-SemiBold')).toEqual({
      base: 'OpenSans', weight: 600, italic: false, weightExplicit: true,
    });
  });

  it('parses space-separated weight suffixes', () => {
    expect(parseFamily('Roboto Bold')).toEqual({
      base: 'Roboto', weight: 700, italic: false, weightExplicit: true,
    });
  });

  it('parses italic suffix', () => {
    expect(parseFamily('Roboto-Italic')).toEqual({
      base: 'Roboto', weight: 400, italic: true, weightExplicit: false,
    });
    expect(parseFamily('Roboto-Bold-Italic')).toEqual({
      base: 'Roboto', weight: 700, italic: true, weightExplicit: true,
    });
  });

  // LEARNINGS.md: macOS PostScript names append PSMT/MT/PS; these must be
  // stripped before the weight-keyword lookup or "BoldMT" isn't recognised.
  it('strips PostScript suffixes before weight lookup (LEARNINGS.md)', () => {
    expect(parseFamily('Helvetica-BoldMT').weight).toBe(700);
    expect(parseFamily('Helvetica-BoldPS').weight).toBe(700);
    expect(parseFamily('Times-BoldPSMT').weight).toBe(700);
  });

  it('leaves unknown suffix tokens as part of the base', () => {
    // "Roboto-Condensed" — "Condensed" is not a weight keyword, so it stays.
    expect(parseFamily('Roboto-Condensed').base).toBe('Roboto-Condensed');
    expect(parseFamily('Roboto-Condensed').weight).toBe(400);
  });
});

describe('normalizePostScriptName', () => {
  it('strips PSMT/MT/PS and splits CamelCase', () => {
    expect(normalizePostScriptName('CourierNewPSMT')).toBe('Courier New');
    expect(normalizePostScriptName('HelveticaNeue')).toBe('Helvetica Neue');
    expect(normalizePostScriptName('TimesNewRoman')).toBe('Times New Roman');
  });

  it('leaves already-clean names alone', () => {
    expect(normalizePostScriptName('Roboto')).toBe('Roboto');
  });
});

describe('fetchFontAsBase64', () => {
  const WOFF2_HEADER = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0xff, 0xff, 0xff, 0xff]);
  const HTML_404 = new TextEncoder().encode('<!doctype html><h1>404</h1>');

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // btoa exists in Node 20+ (this project's runtime); vitest's default env is
    // node, which provides it.
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null on non-OK responses', async () => {
    fetch.mockResolvedValue({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) });
    expect(await fetchFontAsBase64('Roboto-Bold')).toBeNull();
  });

  // LEARNINGS.md: a 404 HTML page base64-encoded into a data: URI fails silently.
  // The magic-byte check catches it.
  it('rejects payloads without WOFF2 magic bytes (LEARNINGS.md)', async () => {
    fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => HTML_404.buffer,
    });
    expect(await fetchFontAsBase64('Roboto-Bold')).toBeNull();
  });

  it('accepts a valid WOFF2 payload and returns base64', async () => {
    fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => WOFF2_HEADER.buffer,
    });
    const result = await fetchFontAsBase64('Roboto-Bold');
    expect(result).not.toBeNull();
    expect(result.family).toBe('Roboto-Bold');
    expect(result.weight).toBe(700);
    expect(result.base64).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(result.bytes).toBe(WOFF2_HEADER.length);
    expect(result.sourceUrl).toMatch(/roboto.*700.*normal\.woff2/);
  });

  it('falls back to latin-ext when latin subset is missing', async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => WOFF2_HEADER.buffer });
    const result = await fetchFontAsBase64('Inter');
    expect(result).not.toBeNull();
    expect(result.sourceUrl).toContain('latin-ext');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
