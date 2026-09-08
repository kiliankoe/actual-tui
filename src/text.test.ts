import { describe, expect, it } from "vitest";
import { fit } from "./text";

describe("fit", () => {
  it("pads short text to the width", () => {
    expect(fit("abc", 5)).toBe("abc  ");
    expect(fit("abc", 5, "right")).toBe("  abc");
  });

  it("truncates long text with an ellipsis", () => {
    expect(fit("abcdefgh", 5)).toBe("abcd…");
  });

  it("returns an empty string for zero width", () => {
    expect(fit("abc", 0)).toBe("");
  });
});
