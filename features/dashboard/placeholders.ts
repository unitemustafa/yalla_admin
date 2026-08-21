export const DASHBOARD_PLACEHOLDERS = {
  user: "/images/placeholders/default_user_avatar.webp",
  customer: "/images/placeholders/default_admin_avatar_alt.webp",
  store: "/images/placeholders/default_store.webp",
  category: "/images/placeholders/default_category.webp",
  product: "/images/placeholders/default_product.webp",
  addon: "/images/placeholders/default_addon.webp",
  offer: "/images/placeholders/default_offer.webp",
  courier: "/images/placeholders/default_courier.webp",
} as const;

export function userAvatarPlaceholder(gender: string | null | undefined) {
  return gender?.trim().toLowerCase() === "female"
    ? DASHBOARD_PLACEHOLDERS.customer
    : DASHBOARD_PLACEHOLDERS.user;
}

export type DashboardPlaceholderType = keyof typeof DASHBOARD_PLACEHOLDERS;

export function imageOrPlaceholder(
  src: string | null | undefined,
  type: DashboardPlaceholderType,
) {
  const value = typeof src === "string" ? src.trim() : "";
  return value.length > 0 ? value : DASHBOARD_PLACEHOLDERS[type];
}
