import type { ShopRow } from "../../admin-api";
import type { ItemRow } from "../types";
import {
  unclassifiedMarketCategoryId,
  type ItemFilters,
  type ItemScopeFilter,
} from "./types";

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
  if (row.visibilityMode !== "regions") return "جاهز للشحن";
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

export function matchesItemSearch(row: ItemRow, searchValue: string) {
  const search = searchValue.trim().toLowerCase();
  return (
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
      .includes(search)
  );
}

function marketCategoryId(market: ShopRow) {
  return market.categoryId || unclassifiedMarketCategoryId;
}

export function deriveItemFilterOptions({
  rows,
  markets,
  search,
  scope,
  cityId,
  categoryId,
}: {
  rows: ItemRow[];
  markets: ShopRow[];
  search: string;
  scope: ItemScopeFilter;
  cityId: string;
  categoryId: string;
}) {
  const matchingMarketIds = new Set(
    rows
      .filter((row) => matchesItemSearch(row, search))
      .map((row) => row.marketId)
      .filter((marketId): marketId is string => Boolean(marketId)),
  );
  const matchingMarkets = markets.filter((market) => matchingMarketIds.has(market.id));
  const cities = new Map<string, string>();

  for (const market of matchingMarkets) {
    if (market.scope !== "service_city") continue;
    const cityIds = market.serviceCityIds ?? [];
    const cityNames = market.serviceCityNames ?? [];
    cityIds.forEach((marketCityId, index) => {
      cities.set(marketCityId, cityNames[index] || `مدينة رقم ${marketCityId}`);
    });
  }

  const scopedMarkets =
    scope === "general"
      ? matchingMarkets.filter((market) => market.scope !== "service_city")
      : scope === "cities" && cityId
        ? matchingMarkets.filter(
            (market) =>
              market.scope === "service_city" &&
              (market.serviceCityIds ?? []).includes(cityId),
          )
        : [];
  const categories = new Map<string, string>();
  for (const market of scopedMarkets) {
    categories.set(marketCategoryId(market), market.category || "غير مصنف");
  }

  return {
    cityOptions: Array.from(cities, ([id, name]) => ({ id, name })).sort((first, second) =>
      compareItemText(first.name, second.name),
    ),
    categoryOptions: Array.from(categories, ([id, name]) => ({ id, name })).sort(
      (first, second) => compareItemText(first.name, second.name),
    ),
    eligibleMarkets: categoryId
      ? scopedMarkets
          .filter((market) => marketCategoryId(market) === categoryId)
          .sort((first, second) => compareItemText(first.name, second.name))
      : [],
  };
}

export function matchesItemFilters(row: ItemRow, filters: ItemFilters) {
  const matchesShop = !filters.shopId || row.marketId === filters.shopId;
  const matchesCategory =
    !filters.categoryId ||
    (filters.categoryId === unclassifiedMarketCategoryId
      ? !row.marketCategoryId
      : row.marketCategoryId === filters.categoryId);
  const matchesScope =
    filters.scope === "all" ||
    (filters.scope === "general"
      ? row.visibilityMode !== "regions"
      : row.visibilityMode === "regions" &&
        Boolean(filters.cityId) &&
        (row.regionSlugs ?? []).includes(filters.cityId));

  return matchesItemSearch(row, filters.search) && matchesShop && matchesCategory && matchesScope;
}
