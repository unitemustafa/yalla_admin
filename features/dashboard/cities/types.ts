export type PolygonGeoJson = {
  type: "Polygon";
  coordinates: number[][][];
};

export type CityBoundaryGeoJson =
  | PolygonGeoJson
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type ServiceCity = {
  id: number;
  name: string;
  center_latitude: string | null;
  center_longitude: string | null;
  radius_km: string | null;
  boundary_geojson: CityBoundaryGeoJson | null;
  boundary_bbox: number[] | null;
  delivery_price: string;
  is_active: boolean;
  archivedAt: string | null;
  deletionMode: "delete" | "archive";
  delivery_area_count: number;
  market_count: number;
  offer_count: number;
};

export type ServiceCityPayload = {
  name: string;
  center_latitude?: string;
  center_longitude?: string;
  radius_km?: string;
  boundary_geojson?: CityBoundaryGeoJson | null;
  boundary_bbox?: number[] | null;
  is_active: boolean;
};

export type ServiceCityCoverage = {
  name: string | null;
  formattedAddress: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number;
  boundingBox: number[] | null;
};

export type DeliveryArea = {
  id: number;
  service_city_id: number;
  name: string;
  center_latitude: string | null;
  center_longitude: string | null;
  radius_km: string | null;
  boundary_geojson: PolygonGeoJson | null;
  boundary_bbox: number[] | null;
  delivery_price: string;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
  is_active: boolean;
};
