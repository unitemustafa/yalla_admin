import type { ItemRow } from "../products/types";
import { asRecord } from "../shared/api-data";
import { formatReferenceCurrency } from "../shared/money";
import { variantFromItem } from "./form-domain";

export function itemPriceLabel(item: ItemRow) {
  return item.displayPriceLabel ?? item.price;
}

function variantAttributeText(value: unknown) {
  const record = asRecord(value);
  if (!record) return "";
  const attribute = asRecord(record.attribute);
  const option = asRecord(record.option);
  const attributeName = String(record.attribute_name ?? attribute?.name ?? "").trim();
  const optionValue = String(record.option_value ?? option?.value ?? "").trim();
  if (!attributeName || !optionValue) return optionValue;
  return `${attributeName}: ${optionValue}`;
}

export function variantLabel(item: ItemRow, variantId: string) {
  const variant = variantFromItem(item, variantId);
  if (!variant) return "اختر التركيبة";
  const attributes = (variant.attribute_values ?? [])
    .map(variantAttributeText)
    .filter(Boolean)
    .join(" / ");
  const fallback = variant.sku?.trim() || `تركيبة #${variant.id}`;
  return `${attributes || fallback} — ${formatReferenceCurrency(Number(variant.price) || 0)}`;
}

export function normalizeProductSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function itemMatchesProductSearch(item: ItemRow, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  const searchable = [
    item.name,
    item.description,
    item.category,
    item.subcategory,
    itemPriceLabel(item),
    item.code,
    item.id,
    item.active ? "نشط active" : "متوقف inactive",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return searchable.includes(normalizedQuery);
}
