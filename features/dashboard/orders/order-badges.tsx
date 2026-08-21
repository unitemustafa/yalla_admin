import { MapPin, Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "../primitives";
import {
  deliveryTypeLabel,
  deliveryTypeTone,
  isDeliveryOrder,
} from "./formatters";
import type { BackendOrder } from "./types";

export function DeliveryTypeBadge({ order }: { order: BackendOrder }) {
  const Icon = isDeliveryOrder(order) ? Truck : MapPin;
  return (
    <Badge tone={deliveryTypeTone(order)}>
      <span className="inline-flex flex-row-reverse items-center gap-1.5">
        <Icon className="size-3.5" />
        {deliveryTypeLabel(order)}
      </span>
    </Badge>
  );
}

export function OrderDeliveryIcon({ order }: { order: BackendOrder }) {
  const deliveryOrder = isDeliveryOrder(order);
  const Icon = deliveryOrder ? Truck : MapPin;
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
        deliveryOrder && "bg-red-500/10 text-red-600 dark:text-red-300",
      )}
      title={deliveryTypeLabel(order)}
      aria-label={deliveryTypeLabel(order)}
    >
      <Icon className="size-5" />
    </span>
  );
}
