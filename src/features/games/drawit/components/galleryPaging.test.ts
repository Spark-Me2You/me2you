import { describe, expect, it } from "vitest";
import { GALLERY_PAGE_SIZE, pageCount, pageSlice } from "./galleryPaging";

const items = Array.from({ length: 19 }, (_, i) => i);

describe("pageCount", () => {
  it("is at least 1", () => {
    expect(pageCount(0)).toBe(1);
  });
  it("rounds up partial pages", () => {
    expect(pageCount(GALLERY_PAGE_SIZE)).toBe(1);
    expect(pageCount(GALLERY_PAGE_SIZE + 1)).toBe(2);
    expect(pageCount(19)).toBe(3);
  });
});

describe("pageSlice", () => {
  it("returns the newest items on page 0", () => {
    expect(pageSlice(items, 0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it("returns a short final page", () => {
    expect(pageSlice(items, 2)).toEqual([16, 17, 18]);
  });
  it("clamps out-of-range pages", () => {
    expect(pageSlice(items, 9)).toEqual([16, 17, 18]);
    expect(pageSlice(items, -1)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it("handles an empty list", () => {
    expect(pageSlice([], 0)).toEqual([]);
  });
});
