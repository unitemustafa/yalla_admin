import { ImageIcon } from "lucide-react";

import { resolveMediaUrl } from "@/lib/media-url";
import { cleanText } from "../../order-display";
import { Badge, Card } from "../../primitives";
import { assignedRepresentativeId, dateTime, orderNumber, representativeName } from "../formatters";
import type { BackendOrder } from "../types";
import { AuthenticatedOrderImage } from "./authenticated-order-image";

export function DeliveryProofCard({ order }: { order: BackendOrder }) {
  const rawProofUrl = cleanText(order.delivery_proof);
  const proofUrl = rawProofUrl ? String(resolveMediaUrl(rawProofUrl) ?? rawProofUrl) : "";
  const representative = assignedRepresentativeId(order) ? representativeName(order) : "الطيار غير محدد";
  const deliveryNote = order.delivery_note?.trim();
  return (
    <Card className="overflow-hidden text-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4">
        <span className="inline-flex items-center gap-2 font-semibold"><ImageIcon className="size-4 text-primary" />إثبات التسليم</span>
        <Badge tone={proofUrl ? "green" : "secondary"}>{proofUrl ? "تم الرفع" : "غير مرفوع"}</Badge>
      </div>
      <div className="grid gap-3 p-5">
        {proofUrl ? (
          <AuthenticatedOrderImage
            src={proofUrl}
            alt={`صورة إثبات تسليم الطلب ${orderNumber(order)}`}
            className="rounded-lg border transition hover:border-primary/40"
          />
        ) : (
          <div className="grid min-h-28 place-items-center gap-2 rounded-lg border border-dashed bg-muted/15 p-4 text-center text-muted-foreground">
            <ImageIcon className="size-7 opacity-60" />
            <p className="text-xs leading-5">{order.status === "delivered" ? "تم تسليم الطلب بدون صورة إثبات." : "ستظهر هنا الصورة التي يرفعها الطيار عند تأكيد التسليم."}</p>
          </div>
        )}
        <div className="rounded-md border bg-muted/10 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <div>الطيار: <span className="font-semibold text-foreground">{representative}</span></div>
          {order.delivered_at ? <div>وقت التسليم: {dateTime(order.delivered_at)}</div> : null}
        </div>
        {deliveryNote ? <div className="rounded-md border bg-muted/10 px-3 py-2"><div className="mb-1 text-xs font-semibold text-muted-foreground">ملاحظة الطيار</div><p className="whitespace-pre-wrap leading-6">{deliveryNote}</p></div> : null}
      </div>
    </Card>
  );
}
