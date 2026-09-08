import { useStdout } from "ink";
import { useEffect, useState } from "react";

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
