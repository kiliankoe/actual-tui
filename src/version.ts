import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * The engine is bundled with the TUI and must know every migration the
 * server's copy of the budget has, so mismatched versions are the most
 * common reason a budget fails to load.
 */
export function bundledApiVersion(): string {
  const require = createRequire(import.meta.url);
  // The package's exports map hides package.json, so walk up from the entry point.
  let dir = dirname(require.resolve("@actual-app/api"));
  for (;;) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      const { name, version } = JSON.parse(readFileSync(manifest, "utf-8"));
      if (name === "@actual-app/api") return version;
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Cannot locate @actual-app/api");
    dir = parent;
  }
}

function numericParts(version: string): number[] {
  return version.split("-")[0].split(".").map(Number);
}

/** Orders by the numeric release only; prerelease suffixes are ignored. */
function compareReleases(a: string, b: string): number {
  const left = numericParts(a);
  const right = numericParts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function versionNotice(
  server: string | null,
  bundled: string,
): string | null {
  if (server === null || server === bundled) return null;
  const order = compareReleases(server, bundled);
  const advice =
    order > 0
      ? "Upgrade actual-tui to a build that matches the server."
      : order < 0
        ? "Upgrade the server or use an older actual-tui build."
        : "Use a build of actual-tui that matches the server.";
  return `The server runs Actual ${server} but this build of actual-tui bundles ${bundled}. ${advice}`;
}

export function withNotice(error: unknown, notice: string | null): Error {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  if (notice === null) return wrapped;
  return new Error(`${wrapped.message}\n${notice}`);
}
