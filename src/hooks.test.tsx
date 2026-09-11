import { Text } from "ink";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { useVisibleRange } from "./hooks";

const HEIGHT = 10;
const TOTAL = 100;

/** Renders the row numbers a window of `HEIGHT` rows would show. */
function Window({ selected }: { selected: number }) {
  const { start, end } = useVisibleRange({
    total: TOTAL,
    selected,
    height: HEIGHT,
  });
  return <Text>{`${start}-${end}`}</Text>;
}

describe("useVisibleRange", () => {
  it("keeps its offset while the cursor moves back up inside the window", () => {
    const { lastFrame, rerender } = render(<Window selected={0} />);
    rerender(<Window selected={40} />);
    const scrolled = lastFrame();
    expect(scrolled).toBe("34-44");

    // The regression: a window derived from the cursor alone shows 28-38 here.
    rerender(<Window selected={37} />);
    expect(lastFrame()).toBe(scrolled);
  });

  it("scrolls again once the cursor reaches the margin", () => {
    const { lastFrame, rerender } = render(<Window selected={40} />);
    rerender(<Window selected={36} />);
    expect(lastFrame()).toBe("33-43");
  });
});
