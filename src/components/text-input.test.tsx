import { render } from "ink-testing-library";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TextInput } from "./text-input";

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));
const LEFT_ARROW = "\x1b[D";
const BACKSPACE = "\x7f";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <TextInput value={value} onChange={setValue} isActive />;
}

describe("TextInput", () => {
  it("inserts typed characters and deletes on backspace", async () => {
    const { stdin, lastFrame } = render(<Harness />);
    await tick();
    stdin.write("a");
    await tick();
    stdin.write("b");
    await tick();
    expect(lastFrame()).toContain("ab");
    stdin.write(BACKSPACE);
    await tick();
    expect(lastFrame()).not.toContain("ab");
    expect(lastFrame()).toContain("a");
  });

  it("inserts at the cursor after moving left", async () => {
    const { stdin, lastFrame } = render(<Harness initial="ac" />);
    await tick();
    stdin.write(LEFT_ARROW);
    await tick();
    stdin.write("b");
    await tick();
    expect(lastFrame()).toContain("abc");
  });

  it("shows the placeholder when inactive and empty", () => {
    const { lastFrame } = render(
      <TextInput
        value=""
        onChange={() => {}}
        isActive={false}
        placeholder="type here"
      />,
    );
    expect(lastFrame()).toContain("type here");
  });
});
