/** Truncates or pads `text` to exactly `width` columns. */
export function fit(
  text: string,
  width: number,
  align: "left" | "right" = "left",
): string {
  if (width <= 0) return "";
  const chars = [...text];
  const truncated =
    chars.length > width ? `${chars.slice(0, width - 1).join("")}…` : text;
  return align === "left" ? truncated.padEnd(width) : truncated.padStart(width);
}
