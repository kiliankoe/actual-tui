import { describe, expect, it } from "vitest";
import { filterByQuery, visibleRange } from "./list";

describe("visibleRange", () => {
  it("shows everything when it fits", () => {
    expect(visibleRange({ total: 3, selected: 0, height: 10 })).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("keeps the selection inside the window when scrolling down", () => {
    expect(visibleRange({ total: 20, selected: 12, height: 5 })).toEqual({
      start: 8,
      end: 13,
    });
  });

  it("does not scroll past the end", () => {
    expect(visibleRange({ total: 20, selected: 19, height: 5 })).toEqual({
      start: 15,
      end: 20,
    });
  });

  it("handles an empty list", () => {
    expect(visibleRange({ total: 0, selected: 0, height: 5 })).toEqual({
      start: 0,
      end: 0,
    });
  });
});

describe("filterByQuery", () => {
  const names = ["Groceries", "Rent", "Restaurants", "Store"];

  it("returns everything for an empty query", () => {
    expect(filterByQuery(names, "", (n) => n)).toEqual(names);
  });

  it("matches case-insensitive substrings, prefixes first", () => {
    expect(filterByQuery(names, "st", (n) => n)).toEqual([
      "Store",
      "Restaurants",
    ]);
  });
});
