import type { MarketClassification } from "./types";

export function normalizeMarketClassification(
  value: unknown,
): MarketClassification | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id = Number(record.id);
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const image =
    typeof record.image === "string" && record.image.trim()
      ? record.image.trim()
      : null;
  const rawType = record.classification_type;
  const classificationType =
    rawType === "popular" || rawType === "featured" || rawType === "normal"
      ? rawType
      : "normal";

  if (!Number.isFinite(id) || !name) return null;

  return {
    id,
    name,
    description,
    image,
    classification_type: classificationType,
    is_active: record.is_active !== false,
  };
}

export function marketClassificationList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: unknown[] }).results;
  }
  return [];
}
