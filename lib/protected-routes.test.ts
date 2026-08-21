import { describe, expect, it } from "vitest";

import { isProtectedPath } from "./protected-routes";

describe("protected dashboard routes", () => {
  it.each([
    "/dashboard",
    "/items/create",
    "/orders/view/42",
    "/cities",
    "/partners",
    "/settings",
  ])("protects %s", (pathname) => {
    expect(isProtectedPath(pathname)).toBe(true);
  });

  it.each(["/", "/login", "/public-page"])("leaves %s public", (pathname) => {
    expect(isProtectedPath(pathname)).toBe(false);
  });
});
