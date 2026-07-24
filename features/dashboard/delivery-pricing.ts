export type DeliveryZoneStatus = "active" | "inactive";

export type DeliveryZone = {
  id: string;
  cityId: string;
  cityName: string;
  name: string;
  fixedDeliveryPrice: number;
  etaMinMinutes: number | null;
  etaMaxMinutes: number | null;
  boundaryGeojson: import("./cities-api").AreaBoundaryGeoJson | null;
  boundarySource: "osm" | "h3" | "manual";
  sourceReference: string;
  h3Resolution: number | null;
  h3Cells: string[];
  status: DeliveryZoneStatus;
  createdAt: string | null;
  updatedAt: string | null;
};
