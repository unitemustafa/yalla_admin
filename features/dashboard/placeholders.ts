export const DASHBOARD_PLACEHOLDERS = {
  user: "/images/placeholders/default_user_avatar.png",
  customer: "/images/placeholders/default_admin_avatar_alt.png",
  store: "/images/placeholders/default_store.png",
  category: "/images/placeholders/default_category.png",
  product: "/images/placeholders/default_product.png",
  addon: "/images/placeholders/default_addon.png",
  offer: "/images/placeholders/default_offer.png",
  courier: "/images/placeholders/default_courier.png",
} as const;

export type DashboardPlaceholderType = keyof typeof DASHBOARD_PLACEHOLDERS;

export function imageOrPlaceholder(
  src: string | null | undefined,
  type: DashboardPlaceholderType,
) {
  const value = typeof src === "string" ? src.trim() : "";
  return value.length > 0 ? value : DASHBOARD_PLACEHOLDERS[type];
}
