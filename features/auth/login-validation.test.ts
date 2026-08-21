import { describe, expect, it } from "vitest";

import {
  loginSubmissionError,
  stripWhitespace,
  validateLoginCredentials,
} from "./login-validation";

describe("login validation", () => {
  it("removes every whitespace character from credentials", () => {
    expect(stripWhitespace(" ad min\t@exa\nmple.com ")).toBe(
      "admin@example.com",
    );
  });

  it.each([
    ["", "", { email: "يرجى إدخال البريد الإلكتروني.", password: "يرجى إدخال كلمة المرور." }],
    ["admin", "secret", { email: "يرجى إدخال بريد إلكتروني صحيح." }],
    ["admin@example.com", "secret", {}],
  ])("validates the current login rules", (email, password, expected) => {
    expect(validateLoginCredentials(email, password)).toEqual(expected);
  });

  it("maps unknown, network, and ordinary errors without changing messages", () => {
    expect(loginSubmissionError(new TypeError("Failed to fetch"))).toBe(
      "تحقق من اتصال الإنترنت ثم حاول مرة أخرى.",
    );
    expect(loginSubmissionError(new Error("custom"))).toBe("custom");
    expect(loginSubmissionError({})).toBe(
      "تعذر تسجيل الدخول. حاول مرة أخرى.",
    );
  });
});
