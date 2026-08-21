import { describe, expect, it } from "vitest";

import {
  firstApiError,
  localizedAuthError,
  positiveInteger,
  RateLimitError,
  retryAfterSeconds,
  shouldKeepLocalSession,
} from "./auth-errors";

describe("auth error mapping", () => {
  it.each([
    [undefined, 0],
    [null, 0],
    [0, 0],
    [-2, 0],
    ["invalid", 0],
    [2, 2],
    ["2.1", 3],
  ])("normalizes positive retry values", (value, expected) => {
    expect(positiveInteger(value)).toBe(expected);
  });

  it("prefers the body retry value over the response header", () => {
    expect(retryAfterSeconds({ retry_after_seconds: 3.2 }, "12")).toBe(4);
    expect(retryAfterSeconds({}, "12")).toBe(12);
  });

  it("finds the first nested API message without trimming it", () => {
    expect(firstApiError({ email: ["  ", { detail: " message " }] })).toBe(
      " message ",
    );
  });

  it.each([
    [
      { detail: "Invalid email or password" },
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    ],
    [
      { detail: "This account has not been verified" },
      "الحساب غير مفعّل. أكّد البريد الإلكتروني أولًا.",
    ],
    [{ email: ["This field is required"] }, "أكمل البريد الإلكتروني وكلمة المرور."],
    [{ detail: "رسالة مخصصة" }, "رسالة مخصصة"],
    [{ detail: [] }, "fallback"],
  ])("localizes known authentication errors", (value, expected) => {
    expect(localizedAuthError(value, "fallback")).toBe(expected);
  });

  it("keeps the rate-limit messages and keep-local classification stable", () => {
    expect(new RateLimitError(4).message).toContain("4 ثانية");
    expect(new RateLimitError(0).message).toBe(
      "طلبات كتير في وقت قصير. استنى شوية وحاول تاني.",
    );
    expect(shouldKeepLocalSession(new RateLimitError(1))).toBe(true);
    expect(shouldKeepLocalSession(new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldKeepLocalSession(new Error("تحقق من اتصال الإنترنت"))).toBe(
      false,
    );
  });
});
