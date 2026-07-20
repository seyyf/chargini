import { describe, it, expect } from "vitest";
import { safeNextPath } from "./safeRedirect";

describe("safeNextPath", () => {
  it("allows a plain site-relative path", () => {
    expect(safeNextPath("/fr")).toBe("/fr");
  });

  it("allows a nested site-relative path", () => {
    expect(safeNextPath("/fr/dashboard")).toBe("/fr/dashboard");
  });

  it("rejects a bare host (no leading slash)", () => {
    expect(safeNextPath("@evil.com")).toBe("/fr");
  });

  it("rejects a relative host that resolves against the current host", () => {
    expect(safeNextPath(".evil.com")).toBe("/fr");
  });

  it("rejects a protocol-relative URL (double slash)", () => {
    expect(safeNextPath("//evil.com")).toBe("/fr");
  });

  it("rejects an absolute URL with a foreign host", () => {
    expect(safeNextPath("https://evil.com")).toBe("/fr");
  });

  it("rejects a backslash-prefixed path (browsers treat // and /\\ alike)", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/fr");
  });

  it("falls back to /fr when next is null or missing", () => {
    expect(safeNextPath(null)).toBe("/fr");
  });
});
