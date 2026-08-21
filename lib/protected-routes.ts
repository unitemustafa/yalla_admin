const protectedRoutePrefixes = [
  "/account",
  "/archives",
  "/categories",
  "/cities",
  "/customers",
  "/dashboard",
  "/delivery",
  "/delivery-zone",
  "/items",
  "/notifications",
  "/offers",
  "/orders",
  "/partners",
  "/settings",
] as const;

export function isProtectedPath(pathname: string) {
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
