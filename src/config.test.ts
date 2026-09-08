import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config";

const fileValues = {
  serverURL: "https://actual.example.com",
  password: "hunter2",
  syncId: "abc-123",
};

function writeConfig(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "actual-tui-test-"));
  const path = join(dir, "config.json");
  writeFileSync(path, contents);
  return path;
}

const missingPath = join(tmpdir(), "actual-tui-does-not-exist.json");

describe("loadConfig", () => {
  it("loads values from the config file", () => {
    const config = loadConfig({
      configPath: writeConfig(JSON.stringify(fileValues)),
      env: {},
    });
    expect(config.serverURL).toBe("https://actual.example.com");
    expect(config.password).toBe("hunter2");
    expect(config.syncId).toBe("abc-123");
    expect(config.dataDir).toContain("actual-tui");
  });

  it("lets env vars override file values", () => {
    const config = loadConfig({
      configPath: writeConfig(JSON.stringify(fileValues)),
      env: { ACTUAL_PASSWORD: "from-env", ACTUAL_DATA_DIR: "/tmp/custom-data" },
    });
    expect(config.password).toBe("from-env");
    expect(config.dataDir).toBe("/tmp/custom-data");
  });

  it("works from env vars alone when no config file exists", () => {
    const config = loadConfig({
      configPath: missingPath,
      env: {
        ACTUAL_SERVER_URL: "https://actual.example.com",
        ACTUAL_PASSWORD: "hunter2",
        ACTUAL_SYNC_ID: "abc-123",
      },
    });
    expect(config.serverURL).toBe("https://actual.example.com");
  });

  it("reports all missing fields in one error", () => {
    const load = () => loadConfig({ configPath: missingPath, env: {} });
    expect(load).toThrow(ConfigError);
    expect(load).toThrow(/serverURL.*password.*syncId/s);
  });

  it("rejects a config file that is not valid JSON", () => {
    const path = writeConfig("not json {");
    expect(() => loadConfig({ configPath: path, env: {} })).toThrow(
      /not valid JSON/,
    );
  });

  it("passes through the optional encryption password", () => {
    const config = loadConfig({
      configPath: writeConfig(JSON.stringify(fileValues)),
      env: { ACTUAL_ENCRYPTION_PASSWORD: "secret" },
    });
    expect(config.encryptionPassword).toBe("secret");
  });

  it("respects XDG_DATA_HOME for the default data dir", () => {
    const config = loadConfig({
      configPath: writeConfig(JSON.stringify(fileValues)),
      env: { XDG_DATA_HOME: "/tmp/xdg-data" },
    });
    expect(config.dataDir).toBe(join("/tmp/xdg-data", "actual-tui"));
  });
});
