import { describe, expect, it } from "vitest";
import { filterByQuery, matchesQuery, visibleRange } from "./list";

describe("visibleRange", () => {
  it("shows everything when it fits", () => {
    expect(visibleRange({ total: 3, selected: 0, height: 10 })).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("leaves the window alone while the cursor stays clear of both edges", () => {
    expect(
      visibleRange({ total: 100, selected: 45, height: 20, start: 30 }),
    ).toEqual({ start: 30, end: 50 });
  });

  it("scrolls down once the cursor comes within the margin of the bottom", () => {
    expect(
      visibleRange({ total: 100, selected: 47, height: 20, start: 30 }),
    ).toEqual({ start: 31, end: 51 });
  });

  it("scrolls up once the cursor comes within the margin of the top", () => {
    expect(
      visibleRange({ total: 100, selected: 32, height: 20, start: 30 }),
    ).toEqual({ start: 29, end: 49 });
  });

  it("lets the cursor reach the first row", () => {
    expect(
      visibleRange({ total: 100, selected: 0, height: 20, start: 5 }),
    ).toEqual({ start: 0, end: 20 });
  });

  it("lets the cursor reach the last row", () => {
    expect(
      visibleRange({ total: 20, selected: 19, height: 5, start: 13 }),
    ).toEqual({ start: 15, end: 20 });
  });

  it("shrinks the margin when the window is too short for it", () => {
    expect(
      visibleRange({ total: 50, selected: 3, height: 5, start: 0 }),
    ).toEqual({ start: 1, end: 6 });
  });

  it("pulls a stale offset back when the list shrinks", () => {
    expect(
      visibleRange({ total: 5, selected: 0, height: 20, start: 40 }),
    ).toEqual({ start: 0, end: 5 });
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

describe("matchesQuery", () => {
  const row = "2026-09-05 Edeka Groceries weekly shop -62.57";

  it("matches when every term appears, ignoring case", () => {
    expect(matchesQuery(row, "edeka gro")).toBe(true);
    expect(matchesQuery(row, "62.57")).toBe(true);
  });

  it("fails when any term is missing", () => {
    expect(matchesQuery(row, "edeka rent")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesQuery(row, "   ")).toBe(true);
  });
});
