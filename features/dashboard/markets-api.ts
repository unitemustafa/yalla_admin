type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type DeliveryArea = {
  id: number;
  service_city_id?: number;
  service_city?: {
    id?: number;
    name?: string;
  };
  service_city_name?: string;
  city_name?: string;
  name?: string;
  delivery_price?: string | number;
  is_active?: boolean;
};

export type DeliveryAreaOption = {
  id: number;
  label: string;
  serviceCityId?: number;
};

function listFromResponse(value: unknown) {
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

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstLabel(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function loadDeliveryAreaOptions(apiFetch: ApiFetch) {
  const response = await apiFetch("locations/delivery-areas/");
  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error("تعذر تحميل مناطق الظهور.");
  }

  const options = new Map<number, DeliveryAreaOption>();

  for (const item of listFromResponse(data)) {
    if (!item || typeof item !== "object") continue;

    const area = item as Partial<DeliveryArea>;
    const id = numberValue(area.id);
    if (id === null || options.has(id)) continue;

    const label =
      firstLabel(
        area.service_city?.name,
        area.service_city_name,
        area.city_name,
        area.name,
      ) || `منطقة رقم ${id}`;
    const serviceCityId = numberValue(area.service_city_id ?? area.service_city?.id);

    options.set(id, {
      id,
      label,
      ...(serviceCityId === null ? {} : { serviceCityId }),
    });
  }

  return Array.from(options.values());
}
