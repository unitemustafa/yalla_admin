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
  archivedAt?: string | null;
  deletionMode?: "delete" | "archive";
  createdAt: string | null;
  updatedAt: string | null;
};
