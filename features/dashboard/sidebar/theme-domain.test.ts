import { describe, expect, it } from "vitest";

import { parseThemeChoice, resolveThemeChoice } from "./theme-domain";

describe("sidebar theme domain", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", "system"],
    ["invalid", "dark"],
    [null, "dark"],
  ] as const)("parses stored theme %j", (stored, expected) => {
    expect(parseThemeChoice(stored)).toBe(expected);
  });

  it("resolves system theme only from the supplied media preference", () => {
    expect(resolveThemeChoice("system", true)).toBe("dark");
    expect(resolveThemeChoice("system", false)).toBe("light");
    expect(resolveThemeChoice("light", true)).toBe("light");
    expect(resolveThemeChoice("dark", false)).toBe("dark");
  });
});
