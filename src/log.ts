import { appendFileSync } from "node:fs";
import { format } from "node:util";

const METHODS = ["log", "info", "warn", "error", "debug"] as const;

/**
 * The budget engine logs freely to the console, which would corrupt the
 * full-screen UI. Route it to a file when requested, otherwise drop it.
 */
export function redirectConsole(logFile: string | undefined): void {
  for (const method of METHODS) {
    console[method] = logFile
      ? (...args: unknown[]) =>
          appendFileSync(
            logFile,
            `${new Date().toISOString()} [${method}] ${format(...args)}\n`,
          )
      : () => {};
  }
}
