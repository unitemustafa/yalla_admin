import type { ServiceCity, ServiceCityPayload } from "./types";

export const citiesPageSize = 5;

export type CityDraft = {
  nameAr: string;
  latitude: string;
  longitude: string;
  radiusKm: string;
  boundaryGeojson: ServiceCity["boundary_geojson"];
  boundaryBbox: number[] | null;
  active: boolean;
};

const defaultCityDraft: CityDraft = {
  nameAr: "",
  latitude: "30.0444000",
  longitude: "31.2357000",
  radiusKm: "",
  boundaryGeojson: null,
  boundaryBbox: null,
  active: true,
};

export function cityDraft(city?: ServiceCity): CityDraft {
  return {
    nameAr: city?.name || defaultCityDraft.nameAr,
    latitude: city?.center_latitude ?? defaultCityDraft.latitude,
    longitude: city?.center_longitude ?? defaultCityDraft.longitude,
    radiusKm: city?.radius_km ?? defaultCityDraft.radiusKm,
    boundaryGeojson: city?.boundary_geojson ?? null,
    boundaryBbox: city?.boundary_bbox ?? null,
    active: city?.is_active ?? true,
  };
}

export function validateCityDraft(draft: CityDraft) {
  const latitude = Number(draft.latitude);
  const longitude = Number(draft.longitude);
  const radiusKm = Number(draft.radiusKm);
  return (
    draft.nameAr.trim().length > 0 &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(radiusKm) &&
    radiusKm > 0
  );
}

export function payloadFromCityDraft(draft: CityDraft): ServiceCityPayload {
  return {
    name: draft.nameAr.trim(),
    center_latitude: Number(draft.latitude).toFixed(7),
    center_longitude: Number(draft.longitude).toFixed(7),
    radius_km: Number(draft.radiusKm).toFixed(2),
    boundary_geojson: draft.boundaryGeojson,
    boundary_bbox: draft.boundaryBbox,
    is_active: draft.active,
  };
}

export function payloadFromCity(city: ServiceCity): ServiceCityPayload {
  return {
    name: city.name,
    center_latitude: city.center_latitude ?? defaultCityDraft.latitude,
    center_longitude: city.center_longitude ?? defaultCityDraft.longitude,
    radius_km: city.radius_km ?? undefined,
    boundary_geojson: city.boundary_geojson,
    boundary_bbox: city.boundary_bbox,
    is_active: city.is_active,
  };
}

export function filterCities(cities: ServiceCity[], query: string) {
  const normalized = query.trim().toLowerCase();
  return normalized
    ? cities.filter((city) => city.name.toLowerCase().includes(normalized))
    : cities;
}

export function cityMetrics(cities: ServiceCity[]) {
  return {
    activeCount: cities.filter((city) => city.is_active).length,
    deliveryAreaTotal: cities.reduce((total, city) => total + city.delivery_area_count, 0),
    linkedMarkets: cities.reduce((total, city) => total + city.market_count, 0),
    linkedOffers: cities.reduce((total, city) => total + city.offer_count, 0),
  };
}

export function formatRadius(value: string | null | undefined) {
  if (!value) return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return `${number.toLocaleString("ar-EG-u-nu-latn")} كم`;
}

export function formatCityMoney(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  const amount = Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
  return `${amount} EGP`;
}
