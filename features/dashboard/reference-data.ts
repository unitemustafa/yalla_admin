export const branchOptions = [
  { id: "eltall-elkabir", labelKey: "branch.default" },
] as const;

export const deliveryZones: Array<{
  id: string;
  name: string;
  fixedDeliveryFee: number;
  createdAt: string;
}> = [];

export const deliveryCityOptions = deliveryZones.map((zone) => zone.name);
