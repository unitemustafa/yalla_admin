import { normalizeImageSrc } from "@/lib/media-url";

import type { BackendRecord } from "../admin-api";
import { asRecord } from "../shared/api-data";
import type { AddonCategoryRecord, AddonRow } from "./types";

const fallbackImage = "/default-user-avatar.svg";

function text(record: BackendRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function nestedName(value: unknown) {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return record ? text(record, ["name", "name_ar", "name_en", "title"]) : "";
}

export function addonRowFromApi(record: BackendRecord, index: number): AddonRow {
  const nameAr = text(record, ["name_ar", "name"], `إضافة #${index + 1}`);
  const rawPrice = text(record, ["price", "amount"], "0");

  return {
    index: String(index + 1),
    id: text(record, ["id", "_id", "uuid", "slug"], String(index + 1)),
    image: normalizeImageSrc(
      text(
        record,
        ["image", "image_url", "thumbnail", "thumbnail_url", "avatar_url"],
        fallbackImage,
      ),
      fallbackImage,
    ),
    name: text(record, ["name_en", "name"], nameAr),
    nameAr,
    price: /\bEGP\b/i.test(rawPrice) ? rawPrice : `${rawPrice} EGP`,
    category:
      nestedName(record.classification) ||
      text(record, ["classification_name", "category"], "غير مصنف"),
    active: record.is_active !== false,
  };
}

export function addonCategoryFromApi(value: BackendRecord): AddonCategoryRecord | null {
  const id = String(value.id ?? "").trim();
  const name = String(value.name ?? "").trim();
  return id && name ? { id, name } : null;
}
