import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Keep vitest out of .direnv, where flake inputs ship their own tests.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
