import type {
  MarketClassification,
  MarketClassificationType,
} from "./types";

const marketClassificationPageSize = 10;

export const classificationTypeOptions: ReadonlyArray<{
  value: MarketClassificationType;
  label: string;
}> = [
  { value: "normal", label: "عادية" },
  { value: "featured", label: "مميزة" },
  { value: "popular", label: "شائعة" },
];

export function classificationTypeLabel(value: MarketClassificationType) {
  return (
    classificationTypeOptions.find((option) => option.value === value)?.label ??
    "عادية"
  );
}

export function translateMarketClassificationError(message: string) {
  if (/a market classification with this name already exists/i.test(message)) {
    return "توجد فئة محلات بهذا الاسم بالفعل.";
  }
  if (
    /cannot delete market classification while markets are using it/i.test(
      message,
    )
  ) {
    return "لا يمكن حذف الفئة لأنها مستخدمة في محلات حالية.";
  }
  if (
    /only four active featured market classifications are allowed/i.test(
      message,
    )
  ) {
    return "اكتملت المقاعد الأربعة للفئات المميزة. عطّل فئة مميزة أولًا لاختيار فئة أخرى.";
  }
  return message;
}

export function classificationNameError(name: string) {
  return name.trim() ? null : "اسم الفئة مطلوب.";
}

export function filterMarketClassifications(
  classifications: MarketClassification[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar-EG");
  if (!normalizedQuery) return classifications;

  return classifications.filter((classification) =>
    [
      classification.name,
      classificationTypeLabel(classification.classification_type),
    ]
      .join(" ")
      .toLocaleLowerCase("ar-EG")
      .includes(normalizedQuery),
  );
}

export function featuredClassificationLimitReached(
  classifications: MarketClassification[],
) {
  return (
    classifications.filter(
      (classification) =>
        classification.is_active &&
        classification.classification_type === "featured",
    ).length >= 4
  );
}

export function paginateMarketClassifications(
  classifications: MarketClassification[],
  currentPage: number,
  pageSize = marketClassificationPageSize,
) {
  const totalPages = Math.max(1, Math.ceil(classifications.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;

  return {
    totalPages,
    safeCurrentPage,
    pageStartIndex,
    items: classifications.slice(pageStartIndex, pageStartIndex + pageSize),
  };
}
