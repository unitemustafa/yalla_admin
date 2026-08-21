import {
  AdminApiError,
  apiErrorMessage,
  deletionResult,
  readApiData,
  type ApiFetch,
} from "../admin-api";
import { apiListData, asRecord } from "../shared/api-data";
import { safeNumber } from "../shared/money";
import { normalizeProduct } from "./normalizers";
import type {
  NormalizedProduct,
  ProductNotificationDispatchResult,
  ProductWritePayload,
} from "./types";

export const productsPath = "catalog/products/";

function backendRecord(value: unknown): Record<string, unknown> | null {
  return asRecord(value);
}

function nullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeIds(values: unknown) {
  return (Array.isArray(values) ? values : [])
    .map((value) => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim() !== "") return Number(value);
      const record = backendRecord(value);
      if (record && "id" in record) return Number(record.id);
      return Number.NaN;
    })
    .filter((id) => Number.isFinite(id));
}

function assertReadableProduct(product: NormalizedProduct, fallback: string) {
  if (!Number.isFinite(product.id)) {
    throw new AdminApiError(fallback, 200, product);
  }
  return product;
}

function assertSaleReadyProduct(
  product: NormalizedProduct,
  payload: ProductWritePayload,
) {
  if (payload.is_available === true && product.variants.length === 0) {
    throw new AdminApiError(
      "حفظ الخادم المنتج دون سعر أو متغير صالح. راجع البيانات وحاول مرة أخرى.",
      200,
      { variants: ["يجب إضافة سعر أو متغير صالح قبل إتاحة المنتج للبيع."] },
    );
  }
  return product;
}

async function parseProductResponse(response: Response, fallback: string) {
  const data = await readApiData(response);
  if (!response.ok) {
    throw new AdminApiError(apiErrorMessage(data, fallback), response.status, data);
  }
  return data;
}

function productPayloadFormData(
  payload: ProductWritePayload,
  imageFiles: readonly File[],
  primaryImageIndex?: number,
) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === "additions") {
      normalizeIds(value).forEach((id) => formData.append("additions", String(id)));
      return;
    }
    if (Array.isArray(value)) {
      formData.set(key, JSON.stringify(value));
      return;
    }
    formData.set(key, typeof value === "boolean" ? String(value) : String(value ?? ""));
  });
  imageFiles.forEach((file) => formData.append("images", file));
  if (primaryImageIndex !== undefined) {
    formData.set("primary_image_index", String(primaryImageIndex));
  }

  return formData;
}

function productRequestInit(
  method: "POST" | "PATCH",
  payload: ProductWritePayload,
  imageFiles: readonly File[] = [],
  primaryImageIndex?: number,
): RequestInit {
  if (imageFiles.length) {
    return {
      method,
      body: productPayloadFormData(payload, imageFiles, primaryImageIndex),
    };
  }

  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

export async function listProducts(apiFetch: ApiFetch, archived = false) {
  const response = await apiFetch(`${productsPath}${archived ? "?archived=true" : ""}`);
  const data = await parseProductResponse(response, "تعذر تحميل المنتجات");
  return apiListData(data).map(normalizeProduct);
}

export async function getProduct(apiFetch: ApiFetch, productId: string | number) {
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/`,
  );
  const data = await parseProductResponse(
    response,
    response.status === 404 ? "تعذر العثور على المنتج" : "تعذر تحميل بيانات المنتج",
  );
  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة بيانات المنتج");
}

export async function createProduct(
  apiFetch: ApiFetch,
  payload: ProductWritePayload,
  imageFiles: readonly File[] = [],
  primaryImageIndex?: number,
) {
  const response = await apiFetch(
    productsPath,
    productRequestInit("POST", payload, imageFiles, primaryImageIndex),
  );
  const data = await parseProductResponse(response, "تعذر حفظ المنتج");
  return assertSaleReadyProduct(
    assertReadableProduct(normalizeProduct(data), "تعذر قراءة بيانات المنتج"),
    payload,
  );
}

export async function updateProduct(
  apiFetch: ApiFetch,
  productId: string | number,
  payload: ProductWritePayload,
  imageFiles: readonly File[] = [],
  primaryImageIndex?: number,
) {
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/`,
    productRequestInit("PATCH", payload, imageFiles, primaryImageIndex),
  );
  const data = await parseProductResponse(response, "تعذر حفظ المنتج");
  return assertSaleReadyProduct(
    assertReadableProduct(normalizeProduct(data), "تعذر قراءة بيانات المنتج"),
    payload,
  );
}

export async function sendProductNotification(
  apiFetch: ApiFetch,
  productId: string | number,
  requestId: string,
): Promise<ProductNotificationDispatchResult> {
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/send-notification/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    },
  );
  const data = await parseProductResponse(response, "تعذر إرسال إشعار المنتج");
  const record = backendRecord(data) ?? {};

  return {
    dispatchId: nullableNumber(record.dispatch_id),
    requestId: typeof record.request_id === "string" ? record.request_id : requestId,
    status: typeof record.status === "string" ? record.status : "",
    recipientCount: safeNumber(record.recipient_count),
    notificationCount: safeNumber(record.notification_count),
    sentAt: typeof record.sent_at === "string" ? record.sent_at : "",
    suppressedByMarketNotification: record.suppressed_by_market_notification === true,
    marketName: typeof record.market_name === "string" ? record.market_name : "",
  };
}

export async function uploadProductImages(
  apiFetch: ApiFetch,
  productId: string | number,
  files: readonly File[],
  primaryImageIndex?: number,
) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  if (primaryImageIndex !== undefined) {
    formData.set("primary_image_index", String(primaryImageIndex));
  }
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/images/`,
    { method: "POST", body: formData },
  );
  const data = await parseProductResponse(response, "تعذر رفع صور المنتج");
  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة صور المنتج");
}

export async function deleteProductImage(
  apiFetch: ApiFetch,
  productId: string | number,
  imageId: number,
) {
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/images/${encodeURIComponent(String(imageId))}/`,
    { method: "DELETE" },
  );
  await parseProductResponse(response, "تعذر حذف صورة المنتج");
}

export async function setPrimaryProductImage(
  apiFetch: ApiFetch,
  productId: string | number,
  imageId: number,
) {
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/images/${encodeURIComponent(String(imageId))}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_primary: true }),
    },
  );
  const data = await parseProductResponse(response, "تعذر تعيين الصورة الرئيسية");
  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة صور المنتج");
}

export async function reorderProductImages(
  apiFetch: ApiFetch,
  productId: string | number,
  imageIds: readonly number[],
) {
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/images/reorder/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_ids: imageIds }),
    },
  );
  const data = await parseProductResponse(response, "تعذر ترتيب صور المنتج");
  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة صور المنتج");
}

export async function deleteProduct(apiFetch: ApiFetch, productId: string | number) {
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/`,
    { method: "DELETE" },
  );
  const data = await parseProductResponse(response, "تعذر حذف المنتج");
  return deletionResult(data);
}

export async function restoreProduct(apiFetch: ApiFetch, productId: string | number) {
  const response = await apiFetch(
    `${productsPath}${encodeURIComponent(String(productId))}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    },
  );
  const data = await parseProductResponse(response, "تعذر استعادة المنتج");
  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة بيانات المنتج");
}

export async function toggleProductAvailability(
  apiFetch: ApiFetch,
  productId: string | number,
  isAvailable: boolean,
) {
  return updateProduct(apiFetch, productId, { is_available: isAvailable });
}
