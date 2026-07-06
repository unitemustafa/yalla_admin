export type DeliveryZoneStatus = "active" | "inactive";

export type DeliveryZone = {
  id: string;
  cityId: string;
  cityName: string;
  name: string;
  fixedDeliveryPrice: number;
  status: DeliveryZoneStatus;
  createdAt: string | null;
  updatedAt: string | null;
};
