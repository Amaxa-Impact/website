import { describe, expect, it } from "vitest";

import {
  checkEstimates,
  defaultSafeDays,
  formatDays,
  parseDays,
} from "./estimates";

describe("parseDays", () => {
  it("accepts a single positive number", () => {
    expect(parseDays("5")).toEqual({ ok: true, value: 5 });
    expect(parseDays(" 2.5 ")).toEqual({ ok: true, value: 2.5 });
  });

  it("treats blank as not answered", () => {
    expect(parseDays("")).toEqual({ ok: true, value: undefined });
    expect(parseDays("   ")).toEqual({ ok: true, value: undefined });
  });

  it.each(["3-5", "3 to 5", "3,5", "3 5", "5d", "5 days", "-2", "abc", "1e3"])(
    "rejects %j (one number only)",
    (text) => {
      expect(parseDays(text).ok).toBe(false);
    },
  );

  it("rejects zero", () => {
    expect(parseDays("0")).toMatchObject({ ok: false });
    expect(parseDays("0.0")).toMatchObject({ ok: false });
  });
});

describe("checkEstimates", () => {
  it("accepts best only, best and safe, or nothing yet", () => {
    expect(checkEstimates("4", "")).toMatchObject({
      valid: true,
      best: 4,
      safe: undefined,
    });
    expect(checkEstimates("4", "7")).toMatchObject({
      valid: true,
      best: 4,
      safe: 7,
    });
    expect(checkEstimates("", "")).toMatchObject({ valid: true });
  });

  it("allows safe equal to best", () => {
    expect(checkEstimates("1", "1").valid).toBe(true);
  });

  it("rejects a safe number below best", () => {
    const result = checkEstimates("5", "3");
    expect(result.valid).toBe(false);
    expect(result.safeError).toMatch(/can't be less/);
  });

  it("asks for best when only safe is given", () => {
    const result = checkEstimates("", "6");
    expect(result.valid).toBe(false);
    expect(result.bestError).toMatch(/best case/);
  });

  it("reports each field's own parse error", () => {
    const result = checkEstimates("3-5", "x");
    expect(result.valid).toBe(false);
    expect(result.bestError).toBeDefined();
    expect(result.safeError).toBeDefined();
  });
});

describe("helpers", () => {
  it("rounds the default safe estimate to one decimal", () => {
    expect(defaultSafeDays(4)).toBe(6);
    expect(defaultSafeDays(3)).toBe(4.5);
    expect(defaultSafeDays(5, 1.25)).toBe(6.3);
  });

  it("pluralises days", () => {
    expect(formatDays(1)).toBe("1 day");
    expect(formatDays(2.5)).toBe("2.5 days");
  });
});
