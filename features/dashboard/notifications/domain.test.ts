import { describe, expect, it } from "vitest";

import {
  clearableReadNotificationIds,
  notificationBooleanValue,
  notificationDisplayMessage,
  notificationDisplayTitle,
  notificationEmptyMessage,
  notificationPage,
  notificationRecordsFromApi,
  notificationTextValue,
  notificationsFromApi,
  numericOrderId,
  relativeNotificationTime,
} from "./domain";
import type { DashboardNotification } from "./types";

const t = (key: string) => key;

function notification(
  overrides: Partial<DashboardNotification> = {},
): DashboardNotification {
  return {
    id: "1",
    audience: "admin",
    type: "system",
    title: "Title",
    message: "Message",
    orderId: "",
    isRead: false,
    isBlocking: false,
    isResolved: false,
    createdAt: "",
    ...overrides,
  };
}

describe("notification API normalization", () => {
  it.each([
    [{ id: 1 }],
    { results: [{ id: 1 }] },
    { data: [{ id: 1 }] },
    { data: { results: [{ id: 1 }] } },
  ])("accepts every supported list envelope", (value) => {
    expect(notificationRecordsFromApi(value)).toEqual([{ id: 1 }]);
  });

  it("filters invalid rows and preserves field fallbacks", () => {
    expect(
      notificationsFromApi([
        null,
        [],
        {
          id: 7,
          audience: " ",
          type: " ",
          title: 12,
          message: " hello ",
          order_id: "0042",
          is_read: "yes",
          is_blocking: "1",
          is_resolved: "false",
        },
      ]),
    ).toEqual([
      notification({
        id: "7",
        type: "system",
        title: "12",
        message: "hello",
        orderId: "0042",
        isRead: true,
        isBlocking: true,
      }),
    ]);
  });

  it("coerces only the supported primitive values", () => {
    expect(notificationTextValue("  value  ")).toBe("value");
    expect(notificationTextValue(Number.NaN, "fallback")).toBe("fallback");
    expect(notificationBooleanValue("TRUE")).toBe(true);
    expect(notificationBooleanValue("0", true)).toBe(false);
    expect(notificationBooleanValue(1, true)).toBe(true);
  });
});

describe("notification presentation rules", () => {
  it("uses translated copy only for new order review notifications", () => {
    const review = notification({
      type: "new_order_review",
      title: "backend title",
      message: "backend message",
    });
    expect(notificationDisplayTitle(review, t)).toBe(
      "notifications.known.newOrderReview.title",
    );
    expect(notificationDisplayMessage(review, t)).toBe(
      "notifications.known.newOrderReview.message",
    );
    expect(notificationDisplayTitle(notification(), t)).toBe("Title");
  });

  it("accepts only all-digit order identifiers", () => {
    expect(numericOrderId(notification({ orderId: "0042" }))).toBe("0042");
    expect(numericOrderId(notification({ orderId: "42-A" }))).toBe("");
  });

  it("keeps filter-specific empty messages", () => {
    expect(notificationEmptyMessage("all", t)).toBe("notifications.empty.all");
    expect(notificationEmptyMessage("unread", t)).toBe(
      "notifications.empty.unread",
    );
    expect(notificationEmptyMessage("read", t)).toBe(
      "notifications.empty.read",
    );
  });

  it("formats relative time using the same thresholds", () => {
    const now = Date.parse("2026-08-21T12:00:00.000Z");
    expect(relativeNotificationTime("", now)).toBe("-");
    expect(relativeNotificationTime("invalid", now)).toBe("invalid");
    expect(
      relativeNotificationTime("2026-08-21T11:58:00.000Z", now),
    ).toBe("قبل دقيقتين");
    expect(
      relativeNotificationTime("2026-08-19T12:00:00.000Z", now),
    ).toBe("أول أمس");
  });
});

describe("notification list calculations", () => {
  it("paginates ten rows and clamps pages after deletions", () => {
    const rows = Array.from({ length: 11 }, (_, index) =>
      notification({ id: String(index + 1) }),
    );
    expect(notificationPage(rows, 2)).toMatchObject({
      totalPages: 2,
      safeCurrentPage: 2,
      notifications: [notification({ id: "11" })],
    });
    expect(notificationPage(rows.slice(0, 2), 2)).toMatchObject({
      totalPages: 1,
      safeCurrentPage: 1,
    });
  });

  it("clears only read notifications that are not unresolved blockers", () => {
    const ids = clearableReadNotificationIds([
      notification({ id: "unread" }),
      notification({ id: "read", isRead: true }),
      notification({ id: "blocked", isRead: true, isBlocking: true }),
      notification({
        id: "resolved",
        isRead: true,
        isBlocking: true,
        isResolved: true,
      }),
    ]);
    expect([...ids]).toEqual(["read", "resolved"]);
  });
});
