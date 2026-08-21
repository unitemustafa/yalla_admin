import { Check, ExternalLink, Loader2 } from "lucide-react";

import { deliveryLaterLabel } from "../../order-display";
import { Button, Card, Input } from "../../primitives";
import { isDeliveryOrder } from "../formatters";
import { isClosedOrderStatus } from "../status-domain";
import type { BackendOrder } from "../types";

export function DeliveryPriceCard({ order, value, saving, onChange, onSave }: { order: BackendOrder; value: string; saving: boolean; onChange: (value: string) => void; onSave: (action: "save" | "request_approval") => void }) {
  const locked = order.delivery_price !== null && order.delivery_price !== undefined && order.delivery_price !== "";
  const canEdit = isDeliveryOrder(order) || !locked;
  if (!canEdit) return null;
  const closed = isClosedOrderStatus(order.status);
  return (
    <Card className="p-5 text-sm">
      <div className="mb-1 font-semibold">{locked ? "سعر التوصيل" : "تسعير التوصيل غير المحدد"}</div>
      {!locked ? <p className="mb-3 text-xs text-muted-foreground">احفظ السعر مباشرة أو أرسله للعميل ليوافق عليه من طلباته.</p> : null}
      <div className="flex items-stretch gap-2">
        <Input min={0} step="0.01" type="number" value={value} onChange={(event) => onChange(event.target.value)} placeholder={deliveryLaterLabel} disabled={locked || saving || closed} className="h-10" />
        <span className="inline-flex h-10 shrink-0 items-center rounded-md border bg-muted/20 px-3 text-xs font-semibold text-muted-foreground">EGP</span>
      </div>
      {!locked ? (
        <div className="mt-3 grid gap-2">
          <Button type="button" disabled={saving || closed || !value.trim()} onClick={() => onSave("request_approval")}>{saving ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}إرسال للعميل للموافقة</Button>
          <Button type="button" variant="outline" disabled={saving || closed || !value.trim()} onClick={() => onSave("save")}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}حفظ واعتماد مباشرة</Button>
        </div>
      ) : null}
      {locked ? <p className="mt-2 text-xs text-muted-foreground">{order.external_shipping_status === "awaiting_customer_approval" ? "تم إرسال السعر، وفي انتظار موافقة العميل." : "سعر التوصيل محفوظ ومعتمد بالفعل ولا يمكن تعديله من هنا."}</p> : null}
      {closed ? <p className="mt-2 text-xs text-muted-foreground">لا يمكن تعديل سعر التوصيل بعد التسليم أو الإلغاء أو تعذر التوصيل.</p> : null}
    </Card>
  );
}
