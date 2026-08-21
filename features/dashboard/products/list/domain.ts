import type { ItemRow } from "../types";
import type { ItemFilters } from "./types";

const itemSortCollator = new Intl.Collator("ar", {
  numeric: true,
  sensitivity: "base",
});

export function compareItemText(firstValue: string, secondValue: string) {
  return itemSortCollator.compare(firstValue.trim(), secondValue.trim());
}

export function compareItems(firstRow: ItemRow, secondRow: ItemRow) {
  const categoryComparison = compareItemText(firstRow.category, secondRow.category);
  return categoryComparison || compareItemText(firstRow.name, secondRow.name);
}

export function itemVisibilityLabel(row: ItemRow) {
  if (row.scopeLabel?.trim()) return row.scopeLabel;
  if (row.visibilityMode !== "regions") return "عام";
  const names = row.regionNames?.length ? row.regionNames : row.regionSlugs;
  return names?.length ? names.join("، ") : "مناطق محددة";
}

export function itemShopLabel(row: ItemRow) {
  return row.shopName?.trim() || "-";
}

export function splitItemPrice(price: string) {
  const normalizedPrice = price.replace(/\s*جنيه/g, " EGP").trim();
  if (
    !normalizedPrice ||
    normalizedPrice === "بدون سعر" ||
    normalizedPrice.includes(" - ")
  ) {
    return { amount: normalizedPrice || "بدون سعر", currency: "" };
  }
  const parts = normalizedPrice.split(/\s+/);
  if (parts[0]?.toUpperCase() === "EGP") {
    return { amount: parts.slice(1).join(" "), currency: parts[0] };
  }
  const [amount = normalizedPrice, currency = ""] = parts;
  return { amount, currency };
}

export function matchesItemFilters(row: ItemRow, filters: ItemFilters) {
  const search = filters.search.trim().toLowerCase();
  const matchesSearch =
    !search ||
    [
      row.code,
      row.id,
      row.name,
      row.description,
      row.category,
      row.shopName,
      row.displayPriceLabel ?? row.price,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  const matchesShop =
    filters.shopIds.length === 0 ||
    (row.marketId ? filters.shopIds.includes(row.marketId) : false);
  const matchesStatus =
    filters.status === "all" ||
    (filters.status === "active" ? row.active : !row.active);
  const matchesScope =
    filters.scope === "all" ||
    (filters.scope === "general"
      ? row.visibilityMode !== "regions"
      : row.visibilityMode === "regions" &&
        filters.cityIds.some((cityId) => (row.regionSlugs ?? []).includes(cityId)));

  return matchesSearch && matchesShop && matchesStatus && matchesScope;
}
