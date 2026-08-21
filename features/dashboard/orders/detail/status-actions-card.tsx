import { XCircle } from "lucide-react";

import { Badge, Button, Card } from "../../primitives";
import { adminStatusActionOptions, statusLabels } from "../constants";
import { statusTone } from "../formatters";
import { canMoveOrderToStatus, orderRouteIndex } from "../status-domain";
import type { BackendOrder, BackendOrderStatus } from "../types";

export function StatusActionsCard({
  order,
  saving,
  onUpdate,
}: {
  order: BackendOrder;
  saving: boolean;
  onUpdate: (status: BackendOrderStatus) => void;
}) {
  const actions = adminStatusActionOptions.filter((option) => canMoveOrderToStatus(order, option));
  return (
    <Card className="p-5">
      <div className="mb-3 font-semibold">حالة الطلب</div>
      <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
      {actions.length ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {actions.map((option) => {
            const current = order.status === option;
            const completed = orderRouteIndex(option) < orderRouteIndex(order.status);
            return <Button key={option} type="button" variant={current ? "default" : "outline"} disabled={saving || current} title={completed ? "مرحلة تمت ولا يمكن الرجوع إليها" : undefined} onClick={() => onUpdate(option)}>{statusLabels[option]}</Button>;
          })}
        </div>
      ) : null}
      {canMoveOrderToStatus(order, "cancelled") ? (
        <div className="mt-3 border-t pt-3">
          <Button type="button" variant="outline" className="w-full" disabled={saving} onClick={() => onUpdate("cancelled")}><XCircle className="size-4" />إلغاء الطلب</Button>
        </div>
      ) : null}
    </Card>
  );
}
