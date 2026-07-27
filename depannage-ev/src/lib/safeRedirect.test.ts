import { describe, it, expect } from "vitest";
import { safeNextPath } from "./safeRedirect";

describe("safeNextPath", () => {
  it("allows a plain site-relative path", () => {
    expect(safeNextPath("/explore")).toBe("/explore");
  });

  it("allows a nested site-relative path", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
  });

  it("rejects a bare host (no leading slash)", () => {
    expect(safeNextPath("@evil.com")).toBe("/");
  });

  it("rejects a relative host that resolves against the current host", () => {
    expect(safeNextPath(".evil.com")).toBe("/");
  });

  it("rejects a protocol-relative URL (double slash)", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
  });

  it("rejects an absolute URL with a foreign host", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
  });

  it("rejects a backslash-prefixed path (browsers treat // and /\\ alike)", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/");
  });

  it("falls back to / when next is null or missing", () => {
    expect(safeNextPath(null)).toBe("/");
  });
});
