import type { AddonDraft, AddonRow } from "./types";

export function addonMatchesSearch(addon: AddonRow, search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;
  return [addon.id, addon.name, addon.nameAr, addon.price, addon.category]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

export function validateAddonDraft(draft: AddonDraft) {
  if (!draft.nameAr.trim()) return "اسم الإضافة مطلوب";
  if (!draft.category.trim()) return "تصنيف الإضافة مطلوب";
  if (!draft.price.trim()) return "سعر الإضافة مطلوب";
  return null;
}

export function addonPricePayload(price: string) {
  return price.trim().replace(/\s*EGP\s*$/i, "");
}

export function classificationIdByName(
  name: string,
  categoryIds: Readonly<Record<string, string | number>>,
  categoryOptions: readonly string[],
) {
  if (categoryIds[name] !== undefined) return categoryIds[name];
  const index = categoryOptions.findIndex((category) => category === name);
  return index >= 0 ? index + 1 : 1;
}

export function translateAddonCategoryDeleteError(message: string) {
  if (/cannot delete addition classification while product additions are using it/i.test(message)) {
    return "لا يمكن حذف التصنيف لأنه مستخدم في إضافات حالية.";
  }
  return message;
}
