// frontend/src/api/kb.test.ts
import { describe, expect, it } from 'vitest';
import { parseTags } from './kb';

describe('parseTags', () => {
  it('returns empty array for null', () => {
    expect(parseTags(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseTags(undefined as unknown as string | null)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseTags('')).toEqual([]);
  });

  it('parses valid JSON array of strings', () => {
    expect(parseTags('["ai","research"]')).toEqual(['ai', 'research']);
    expect(parseTags('["single"]')).toEqual(['single']);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseTags('not json')).toEqual([]);
    expect(parseTags('{')).toEqual([]);
    expect(parseTags('[]]')).toEqual([]);
  });

  it('returns empty array for JSON that is not an array', () => {
    expect(parseTags('{}')).toEqual([]);
    expect(parseTags('"string"')).toEqual([]);
  });
});
