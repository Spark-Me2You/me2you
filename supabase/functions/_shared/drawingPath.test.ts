import { describe, it, expect } from 'vitest';
import { isSafeTempDrawingPath } from './drawingPath.ts';

const org = '11111111-1111-1111-1111-111111111111';

describe('isSafeTempDrawingPath', () => {
  it('accepts a file inside the org folder', () => {
    expect(isSafeTempDrawingPath(`${org}/abc.png`, org)).toBe(true);
  });
  it('rejects non-strings', () => {
    expect(isSafeTempDrawingPath(undefined, org)).toBe(false);
    expect(isSafeTempDrawingPath(42, org)).toBe(false);
  });
  it('rejects another org prefix or a prefix lookalike', () => {
    expect(isSafeTempDrawingPath('other/abc.png', org)).toBe(false);
    expect(isSafeTempDrawingPath(`${org}x/abc.png`, org)).toBe(false);
  });
  it('rejects traversal, leading slash and backslash', () => {
    expect(isSafeTempDrawingPath(`${org}/../other/a.png`, org)).toBe(false);
    expect(isSafeTempDrawingPath(`/${org}/a.png`, org)).toBe(false);
    expect(isSafeTempDrawingPath(`${org}/a\\b.png`, org)).toBe(false);
  });
  it('rejects an empty file name', () => {
    expect(isSafeTempDrawingPath(`${org}/`, org)).toBe(false);
  });
});
