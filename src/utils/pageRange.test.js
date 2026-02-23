import { describe, it, expect } from 'vitest';
import { parsePageRange, toPageRangeString } from './pageRange';

describe('parsePageRange', () => {
  it('parses ranges and single pages', () => {
    expect(parsePageRange('1-3,5', 6)).toEqual([0, 1, 2, 4]);
  });

  it('handles reversed ranges', () => {
    expect(parsePageRange('3-1', 4)).toEqual([0, 1, 2]);
  });

  it('deduplicates pages', () => {
    expect(parsePageRange('2,2,2', 4)).toEqual([1]);
  });

  it('ignores out of bounds pages', () => {
    expect(parsePageRange('0, 999', 5)).toEqual([]);
  });

  it('handles whitespace and single values', () => {
    expect(parsePageRange(' 4 - 4 , 2 ', 5)).toEqual([1, 3]);
  });

  it('returns empty for invalid input', () => {
    expect(parsePageRange('abc, -', 10)).toEqual([]);
  });
});

describe('toPageRangeString', () => {
  it('formats indices as 1-based list', () => {
    expect(toPageRangeString([4, 0, 2])).toBe('1, 3, 5');
  });
});
