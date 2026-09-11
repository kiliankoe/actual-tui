import { useStdout } from "ink";
import { useEffect, useState } from "react";
import { visibleRange } from "./list";

function sizeOf(stdout: NodeJS.WriteStream) {
  return { columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 };
}

export function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState(() => sizeOf(stdout));

  useEffect(() => {
    const onResize = () => setSize(sizeOf(stdout));
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}

/**
 * Scroll window that keeps its offset across renders, so the cursor can move
 * within it. Adjusting state during render lets the window settle before the
 * frame is committed, which avoids drawing one frame at the stale offset.
 */
export function useVisibleRange(view: {
  total: number;
  selected: number;
  height: number;
}) {
  const [start, setStart] = useState(0);
  const range = visibleRange({ ...view, start });
  if (range.start !== start) setStart(range.start);
  return range;
}
