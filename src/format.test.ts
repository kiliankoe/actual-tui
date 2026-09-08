import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatAmountForInput,
  parseAmount,
  todayISO,
} from "./format";

describe("formatAmount", () => {
  it("formats integer cents with two decimals by default", () => {
    expect(formatAmount(123456)).toBe("1,234.56");
    expect(formatAmount(-5)).toBe("-0.05");
    expect(formatAmount(0)).toBe("0.00");
  });

  it("follows Actual's dot-comma number format", () => {
    expect(formatAmount(123456, { numberFormat: "dot-comma" })).toBe(
      "1.234,56",
    );
  });

  it("drops the fraction when hideFraction is set", () => {
    expect(formatAmount(123456, { hideFraction: true })).toBe("1,235");
  });

  it("uses a typographic apostrophe for apostrophe-dot", () => {
    expect(formatAmount(123456, { numberFormat: "apostrophe-dot" })).toBe(
      "1’234.56",
    );
  });
});

describe("parseAmount", () => {
  it("parses plain decimals into cents", () => {
    expect(parseAmount("12.34")).toBe(1234);
    expect(parseAmount("12")).toBe(1200);
    expect(parseAmount("0.5")).toBe(50);
    expect(parseAmount("-7.25")).toBe(-725);
  });

  it("ignores thousands separators and whitespace", () => {
    expect(parseAmount(" 1,234.56 ")).toBe(123456);
  });

  it("honours the decimal separator of the number format", () => {
    expect(parseAmount("1.234,56", { numberFormat: "dot-comma" })).toBe(123456);
  });

  it("rounds to whole cents", () => {
    expect(parseAmount("1.005")).toBe(101);
  });

  it("returns null for anything that is not a number", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.2.3")).toBeNull();
  });
});

describe("todayISO", () => {
  it("returns a YYYY-MM-DD date", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatAmountForInput", () => {
  it("uses plain digits with the format's decimal separator", () => {
    expect(formatAmountForInput(123456)).toBe("1234.56");
    expect(formatAmountForInput(123456, { numberFormat: "dot-comma" })).toBe(
      "1234,56",
    );
    expect(formatAmountForInput(-5)).toBe("-0.05");
  });

  it("round-trips through parseAmount", () => {
    expect(parseAmount(formatAmountForInput(987654))).toBe(987654);
  });
});
