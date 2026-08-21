import { deletionResult } from "../admin-api";
import { apiListData } from "../shared/api-data";
import {
  cityFromResponse,
  deliveryAreaFromResponse,
  firstCityApiError,
} from "./normalizers";
import type {
  DeliveryArea,
  ServiceCity,
  ServiceCityCoverage,
  ServiceCityPayload,
} from "./types";

async function responseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

export async function loadServiceCities(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  {
    activeOnly = false,
    archived = false,
    preferArabicName = false,
    errorFallback = "تعذر تحميل المدن من الخادم.",
  } = {},
) {
  const response = await apiFetch(
    `locations/service-cities/${archived ? "?archived=true" : ""}`,
  );
  const data = await responseJson(response);
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(firstCityApiError(data) ?? errorFallback);
  }
  const cities = data
    .map((value) => cityFromResponse(value, preferArabicName))
    .filter((city): city is ServiceCity => Boolean(city));
  return activeOnly ? cities.filter((city) => city.is_active) : cities;
}

export async function saveServiceCity(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  payload: ServiceCityPayload | Partial<ServiceCityPayload>,
  cityId?: number,
) {
  const response = await apiFetch(
    cityId
      ? `locations/service-cities/${cityId}/`
      : "locations/service-cities/",
    {
      method: cityId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = await responseJson(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(firstCityApiError(data) ?? "تعذر حفظ المدينة.");
  }
  const city = cityFromResponse(data);
  if (!city) {
    throw new Error("تم الحفظ لكن استجابة الباك غير مكتملة.");
  }
  return city;
}

export async function deleteServiceCity(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  cityId: number,
) {
  const response = await apiFetch(`locations/service-cities/${cityId}/`, {
    method: "DELETE",
  });
  const data = await responseJson(response);
  if (response.ok) return deletionResult(data);
  if (
    data &&
    typeof data === "object" &&
    "relations" in data &&
    data.relations &&
    typeof data.relations === "object"
  ) {
    const labels: Record<string, string> = {
      delivery_areas: "مناطق التوصيل",
      markets: "المحلات",
      offers: "العروض",
      couriers: "المندوبون",
      addresses: "عناوين العملاء",
      orders: "الطلبات",
      users: "حسابات العملاء",
    };
    const linkedData = Object.entries(data.relations)
      .filter(([, count]) => typeof count === "number" && count > 0)
      .map(([key, count]) => `${labels[key] ?? key} (${count})`);
    if (linkedData.length) {
      throw new Error(
        `لا يمكن حذف المدينة لأنها مرتبطة بـ: ${linkedData.join("، ")}. انقل أو احذف هذه البيانات أولًا.`,
      );
    }
  }
  throw new Error(firstCityApiError(data) ?? "تعذر حذف المدينة.");
}

export async function restoreServiceCity(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  cityId: number,
) {
  const response = await apiFetch(`locations/service-cities/${cityId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restore: true }),
  });
  const data = await responseJson(response);
  if (!response.ok) {
    throw new Error(firstCityApiError(data) ?? "تعذر استعادة المدينة.");
  }
  const city = cityFromResponse(data);
  if (!city) {
    throw new Error("تمت الاستعادة لكن استجابة المدينة غير مكتملة.");
  }
  return city;
}

export async function lookupServiceCityCoverage(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  cityName: string,
) {
  const response = await apiFetch(
    `locations/service-cities/coverage-lookup/?q=${encodeURIComponent(cityName)}&lang=ar`,
  );
  const data = await responseJson(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(firstCityApiError(data) ?? "تعذر تحديد نطاق المدينة تلقائيًا.");
  }
  const coverage = (data as { coverage?: unknown }).coverage;
  if (!coverage || typeof coverage !== "object") {
    throw new Error("استجابة تحديد نطاق المدينة غير مكتملة.");
  }
  const record = coverage as Record<string, unknown>;
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  const radiusKm = Number(record.radius_km);
  const rawBoundingBox = record.bounding_box;
  const boundingBox =
    rawBoundingBox && typeof rawBoundingBox === "object"
      ? [
          Number((rawBoundingBox as Record<string, unknown>).west),
          Number((rawBoundingBox as Record<string, unknown>).south),
          Number((rawBoundingBox as Record<string, unknown>).east),
          Number((rawBoundingBox as Record<string, unknown>).north),
        ]
      : null;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(radiusKm) ||
    radiusKm <= 0
  ) {
    throw new Error("تعذر حساب مركز المدينة ونصف قطرها.");
  }
  return {
    name: typeof record.name === "string" ? record.name : null,
    formattedAddress:
      typeof record.formatted_address === "string"
        ? record.formatted_address
        : null,
    latitude,
    longitude,
    radiusKm,
    boundingBox:
      boundingBox?.every((value) => Number.isFinite(value)) === true
        ? boundingBox
        : null,
  } satisfies ServiceCityCoverage;
}

export async function loadDeliveryAreas(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  cityId: number,
) {
  const response = await apiFetch(
    `locations/delivery-areas/?service_city_id=${encodeURIComponent(cityId)}`,
  );
  const data = await responseJson(response);
  if (!response.ok) {
    throw new Error(firstCityApiError(data) ?? "تعذر تحميل مناطق التوصيل.");
  }
  return apiListData<unknown>(data)
    .map(deliveryAreaFromResponse)
    .filter((area): area is DeliveryArea => Boolean(area));
}
