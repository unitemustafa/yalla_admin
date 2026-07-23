export type DeliveryZoneStatus = "active" | "inactive";

export type DeliveryZone = {
  id: string;
  cityId: string;
  cityName: string;
  name: string;
  fixedDeliveryPrice: number;
  etaMinMinutes: number | null;
  etaMaxMinutes: number | null;
  boundaryGeojson: import("./cities-api").PolygonGeoJson | null;
  status: DeliveryZoneStatus;
  createdAt: string | null;
  updatedAt: string | null;
};
