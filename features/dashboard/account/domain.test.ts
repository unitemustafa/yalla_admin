import { describe, expect, it } from "vitest";

import {
  accountDisplayName,
  accountNamePayload,
  firstAccountApiError,
  localizedPasswordError,
  localizedProfileError,
  maxAvatarSize,
  resetCodeCooldown,
  splitAccountDisplayName,
  stripAccountWhitespace,
  validateAccountOtp,
  validateAccountPassword,
  validateAvatarFile,
} from "./domain";

describe("account name helpers", () => {
  it("builds display names with username and neutral fallbacks", () => {
    expect(accountDisplayName("Ahmed", "Ali", "admin")).toBe("Ahmed Ali");
    expect(accountDisplayName("", "", "admin")).toBe("admin");
    expect(accountDisplayName()).toBe("مستخدم النظام");
  });

  it("normalizes and splits a changed display name", () => {
    expect(splitAccountDisplayName("  Ahmed   Mohamed Ali  ")).toEqual({
      first_name: "Ahmed",
      last_name: "Mohamed Ali",
    });
  });

  it("preserves original name parts when the display name did not change", () => {
    const user = {
      first_name: "Ahmed Mohamed",
      last_name: "Ali",
      username: "admin",
    };
    expect(accountNamePayload("Ahmed Mohamed Ali", user)).toEqual({
      first_name: "Ahmed Mohamed",
      last_name: "Ali",
    });
    expect(accountNamePayload("Omar Hassan", user)).toEqual({
      first_name: "Omar",
      last_name: "Hassan",
    });
  });
});

describe("account password validation", () => {
  it.each([
    ["Short1!", "Short1!", "كلمة المرور يجب ألا تقل عن 8 أحرف."],
    ["Password 1!", "Password 1!", "المسافات غير مسموحة في كلمة المرور."],
    ["password1!", "password1!", "أضف حرفًا إنجليزيًا كبيرًا إلى كلمة المرور."],
    ["Password!", "Password!", "أضف رقمًا إلى كلمة المرور."],
    ["Password1", "Password1", "أضف رمزًا خاصًا إلى كلمة المرور."],
    ["Password1!", "Password2!", "تأكيد كلمة المرور غير مطابق."],
    ["Password1!", "Password1!", null],
  ])("keeps the ordered password rules", (password, confirmation, error) => {
    expect(validateAccountPassword(password, confirmation)).toBe(error);
  });

  it("normalizes fields and validates six digit codes", () => {
    expect(stripAccountWhitespace(" Pass word 1! ")).toBe("Password1!");
    expect(validateAccountOtp("123456")).toBeNull();
    expect(validateAccountOtp("12345A")).toBe(
      "أدخل كود التحقق المكون من 6 أرقام.",
    );
  });
});

describe("account API and upload errors", () => {
  it("finds the first nested API error", () => {
    expect(firstAccountApiError({ email: ["Already used"], other: "Later" })).toBe(
      "Already used",
    );
    expect(firstAccountApiError({ empty: [] })).toBeNull();
  });

  it("localizes known profile and password errors", () => {
    expect(
      localizedProfileError(
        "User with this email already exists.",
        "fallback",
      ),
    ).toBe("البريد الإلكتروني مسجل بالفعل.");
    expect(
      localizedPasswordError("Invalid verification code", "fallback"),
    ).toBe("كود التحقق غير صحيح.");
    expect(localizedPasswordError(null, "fallback")).toBe("fallback");
  });

  it("validates avatar MIME type before its size", () => {
    expect(
      validateAvatarFile({ type: "image/gif", size: maxAvatarSize + 1 }),
    ).toEqual({
      valid: false,
      message: "ارفع صورة صالحة بصيغة JPG أو JPEG أو PNG أو WEBP.",
    });
    expect(
      validateAvatarFile({ type: "image/png", size: maxAvatarSize + 1 }),
    ).toEqual({
      valid: false,
      message: "يجب ألا يتجاوز حجم الصورة الشخصية 5 ميجابايت.",
    });
    expect(validateAvatarFile({ type: "image/webp", size: maxAvatarSize })).toEqual(
      { valid: true },
    );
  });

  it("uses the same resend cooldown precedence and fallback", () => {
    expect(
      resetCodeCooldown({ resend_after_seconds: 45, retry_after_seconds: 60 }),
    ).toBe(45);
    expect(resetCodeCooldown({ retry_after_seconds: 20 })).toBe(20);
    expect(resetCodeCooldown(null)).toBe(30);
  });
});
