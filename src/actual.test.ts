import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@actual-app/api", () => ({
  init: vi.fn(async () => {}),
  getServerVersion: vi.fn(),
  downloadBudget: vi.fn(async () => {}),
  deleteTransaction: vi.fn(),
  getCategories: vi.fn(),
  getCategoryGroups: vi.fn(),
  getPayees: vi.fn(),
  sync: vi.fn(),
}));

import * as api from "@actual-app/api";
import { connect } from "./actual";
import { bundledApiVersion } from "./version";

const ENGINE_ERROR =
  "This budget could not be loaded because it uses a newer database schema than this version of Actual supports.";

const config = {
  serverURL: "http://actual.test",
  password: "pw",
  syncId: "sync",
  dataDir: mkdtempSync(join(tmpdir(), "actual-tui-connect-")),
};

describe("connect", () => {
  beforeEach(() => {
    vi.mocked(api.downloadBudget).mockResolvedValue(undefined);
  });

  it("returns no notice when the server matches the bundled engine", async () => {
    vi.mocked(api.getServerVersion).mockResolvedValue({
      version: bundledApiVersion(),
    });
    await expect(connect(config)).resolves.toBeNull();
  });

  it("returns a notice when versions differ but the budget still loads", async () => {
    vi.mocked(api.getServerVersion).mockResolvedValue({ version: "99.1.0" });
    await expect(connect(config)).resolves.toMatch(/Upgrade actual-tui/);
  });

  it("explains a failed download with both versions", async () => {
    vi.mocked(api.getServerVersion).mockResolvedValue({ version: "99.1.0" });
    vi.mocked(api.downloadBudget).mockRejectedValue(new Error(ENGINE_ERROR));
    await expect(connect(config)).rejects.toThrow(
      `${ENGINE_ERROR}\nThe server runs Actual 99.1.0 but this build of actual-tui bundles ${bundledApiVersion()}. Upgrade actual-tui to a build that matches the server.`,
    );
  });

  it("passes engine errors through when the server version is unknown", async () => {
    vi.mocked(api.getServerVersion).mockResolvedValue({
      error: "network-failure",
    });
    vi.mocked(api.downloadBudget).mockRejectedValue(new Error(ENGINE_ERROR));
    await expect(connect(config)).rejects.toThrow(new Error(ENGINE_ERROR));
  });
});
