import {
  apiErrorMessage,
  apiList,
  readApiData,
  sendAdminJson,
  type ApiFetch,
} from "../admin-api";
import { asRecord } from "../shared/api-data";
import { addonPricePayload } from "./domain";
import { addonCategoryFromApi, addonRowFromApi } from "./normalizers";
import type { AddonCategoryRecord, AddonRow } from "./types";

export const productAdditionsPath = "catalog/product-additions/";
const additionClassificationsPath = "catalog/addition-classifications/";

export type AddonCatalog = {
  addons: AddonRow[];
  categories: AddonCategoryRecord[] | null;
  categoryIds: Record<string, string | number> | null;
};

export async function fetchAddonRows(apiFetch: ApiFetch) {
  const response = await apiFetch(productAdditionsPath);
  const data = await readApiData(response);
  return {
    ok: response.ok,
    data,
    addons: response.ok ? apiList(data).map(addonRowFromApi) : [],
  };
}

async function listAddons(apiFetch: ApiFetch) {
  const result = await fetchAddonRows(apiFetch);
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.data, "تعذر تحميل الإضافات من الباك."));
  }
  return result.addons;
}

export async function loadAddonCatalog(apiFetch: ApiFetch): Promise<AddonCatalog> {
  const [addons, categoriesResponse] = await Promise.all([
    listAddons(apiFetch),
    apiFetch(additionClassificationsPath),
  ]);
  const categoriesData = await readApiData(categoriesResponse);
  if (!categoriesResponse.ok) {
    return { addons, categories: null, categoryIds: null };
  }
  const categoryRecords = apiList(categoriesData);
  const categories = categoryRecords
    .map(addonCategoryFromApi)
    .filter((category): category is AddonCategoryRecord => category !== null);
  const categoryIds = categoryRecords.reduce<Record<string, string | number>>(
    (ids, item) => {
      const name = String(item.name ?? "").trim();
      if (name && (typeof item.id === "string" || typeof item.id === "number")) {
        ids[name] = item.id;
      }
      return ids;
    },
    {},
  );
  return { addons, categories, categoryIds };
}

export async function createAddon(
  apiFetch: ApiFetch,
  input: {
    classificationId: string | number;
    nameAr: string;
    price: string;
    imageFile: File | null;
  },
) {
  const formData = new FormData();
  formData.set("classification_id", String(input.classificationId));
  formData.set("name_ar", input.nameAr.trim());
  formData.set("name_en", input.nameAr.trim());
  formData.set("price", input.price.trim());
  formData.set("is_active", "true");
  if (input.imageFile) formData.set("image", input.imageFile);

  const response = await apiFetch(productAdditionsPath, {
    method: "POST",
    body: formData,
  });
  const data = await readApiData(response);
  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "تعذر إنشاء الإضافة في الباك."));
  }
  return addonRowFromApi(asRecord(data) ?? {}, 0);
}

export async function updateAddon(apiFetch: ApiFetch, addon: AddonRow, classificationId: string | number) {
  const data = await sendAdminJson(
    apiFetch,
    `${productAdditionsPath}${encodeURIComponent(addon.id)}/`,
    {
      method: "PATCH",
      body: JSON.stringify({
        classification_id: classificationId,
        name_ar: addon.nameAr,
        name_en: addon.nameAr,
        price: addonPricePayload(addon.price),
        is_active: addon.active !== false,
      }),
    },
  );
  return addonRowFromApi(asRecord(data) ?? {}, 0);
}

export async function setAddonActive(apiFetch: ApiFetch, addonId: string, active: boolean) {
  const data = await sendAdminJson(
    apiFetch,
    `${productAdditionsPath}${encodeURIComponent(addonId)}/`,
    { method: "PATCH", body: JSON.stringify({ is_active: active }) },
  );
  return addonRowFromApi(asRecord(data) ?? {}, 0);
}

export function removeAddon(apiFetch: ApiFetch, addonId: string) {
  return sendAdminJson(
    apiFetch,
    `${productAdditionsPath}${encodeURIComponent(addonId)}/`,
    { method: "DELETE" },
  );
}

export async function createAddonCategory(apiFetch: ApiFetch, name: string) {
  const data = await sendAdminJson(apiFetch, additionClassificationsPath, {
    method: "POST",
    body: JSON.stringify({ name: name.trim() }),
  });
  return addonCategoryFromApi(asRecord(data) ?? {});
}

export async function updateAddonCategory(
  apiFetch: ApiFetch,
  categoryId: string,
  name: string,
) {
  const data = await sendAdminJson(
    apiFetch,
    `${additionClassificationsPath}${encodeURIComponent(categoryId)}/`,
    { method: "PATCH", body: JSON.stringify({ name: name.trim() }) },
  );
  return addonCategoryFromApi(asRecord(data) ?? {});
}

export function removeAddonCategory(apiFetch: ApiFetch, categoryId: string) {
  return sendAdminJson(
    apiFetch,
    `${additionClassificationsPath}${encodeURIComponent(categoryId)}/`,
    { method: "DELETE" },
  );
}
