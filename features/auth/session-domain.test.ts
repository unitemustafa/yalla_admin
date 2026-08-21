import { describe, expect, it } from "vitest";

import {
  parseSessionExpiresAt,
  remainingSessionMaxAge,
  sessionExpiredNoticeState,
} from "./session-domain";

describe("auth session domain", () => {
  it.each([
    [null, null],
    ["", null],
    ["invalid", null],
    ["0", null],
    ["-1", null],
    ["1720000000000", 1_720_000_000_000],
  ])("parses stored expiry %j", (value, expected) => {
    expect(parseSessionExpiresAt(value)).toBe(expected);
  });

  it("rounds the remaining cookie lifetime up to whole seconds", () => {
    expect(remainingSessionMaxAge(11_501, 10_000)).toBe(2);
    expect(remainingSessionMaxAge(10_001, 10_000)).toBe(1);
    expect(remainingSessionMaxAge(10_000, 10_000)).toBe(0);
    expect(remainingSessionMaxAge(null, 10_000)).toBe(0);
  });

  it.each([
    [{ queryExpired: true, storedExpiry: null, storedNotice: null }, true],
    [{ queryExpired: false, storedExpiry: null, storedNotice: "true" }, true],
    [
      {
        queryExpired: false,
        storedExpiry: "9999",
        storedNotice: null,
      },
      true,
    ],
    [
      {
        queryExpired: false,
        storedExpiry: "10001",
        storedNotice: null,
      },
      false,
    ],
  ])("derives the expired-session notice", (input, shouldShow) => {
    expect(sessionExpiredNoticeState({ ...input, now: 10_000 }).shouldShow).toBe(
      shouldShow,
    );
  });

  it("preserves the existing cleanup rule for empty and elapsed expiry", () => {
    expect(
      sessionExpiredNoticeState({
        queryExpired: false,
        storedExpiry: null,
        storedNotice: null,
        now: 10_000,
      }).shouldRemoveExpiry,
    ).toBe(true);
    expect(
      sessionExpiredNoticeState({
        queryExpired: false,
        storedExpiry: "invalid",
        storedNotice: null,
        now: 10_000,
      }).shouldRemoveExpiry,
    ).toBe(false);
  });
});
