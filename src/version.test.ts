import { describe, expect, it } from "vitest";
import { bundledApiVersion, versionNotice, withNotice } from "./version";

describe("bundledApiVersion", () => {
  it("reads the version of the installed engine", () => {
    expect(bundledApiVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("versionNotice", () => {
  it("is silent when server and bundled versions match", () => {
    expect(versionNotice("26.9.0", "26.9.0")).toBeNull();
  });

  it("is silent when the server version is unknown", () => {
    expect(versionNotice(null, "26.9.0")).toBeNull();
  });

  it("asks to upgrade actual-tui when the server is newer", () => {
    expect(versionNotice("26.9.0", "26.8.1")).toBe(
      "The server runs Actual 26.9.0 but this build of actual-tui bundles 26.8.1. " +
        "Upgrade actual-tui to a build that matches the server.",
    );
  });

  it("asks to upgrade the server when actual-tui is newer", () => {
    expect(versionNotice("26.8.1", "26.9.0")).toBe(
      "The server runs Actual 26.8.1 but this build of actual-tui bundles 26.9.0. " +
        "Upgrade the server or use an older actual-tui build.",
    );
  });

  it("compares numerically rather than lexically", () => {
    expect(versionNotice("26.10.0", "26.9.0")).toMatch(/Upgrade actual-tui/);
  });

  it("flags prerelease builds of the same release without a direction", () => {
    expect(versionNotice("26.10.0", "26.10.0-nightly.20260902")).toBe(
      "The server runs Actual 26.10.0 but this build of actual-tui bundles " +
        "26.10.0-nightly.20260902. Use a build of actual-tui that matches the server.",
    );
  });
});

describe("withNotice", () => {
  it("returns the original error when there is no notice", () => {
    const error = new Error("boom");
    expect(withNotice(error, null)).toBe(error);
  });

  it("appends the notice to the engine's message", () => {
    const error = withNotice(new Error("boom"), "Versions differ.");
    expect(error.message).toBe("boom\nVersions differ.");
  });

  it("wraps non-Error values", () => {
    expect(withNotice("boom", "Versions differ.").message).toBe(
      "boom\nVersions differ.",
    );
  });
});
