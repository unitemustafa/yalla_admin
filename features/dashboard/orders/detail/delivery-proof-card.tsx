import { ExternalLink, ImageIcon } from "lucide-react";

import { resolveMediaUrl } from "@/lib/media-url";
import { cleanText } from "../../order-display";
import { DashboardImage } from "../../dashboard-image";
import { Badge, Card } from "../../primitives";
import { assignedRepresentativeId, dateTime, orderNumber, representativeName } from "../formatters";
import type { BackendOrder } from "../types";

export function DeliveryProofCard({ order }: { order: BackendOrder }) {
  const rawProofUrl = cleanText(order.delivery_proof);
  const proofUrl = rawProofUrl ? String(resolveMediaUrl(rawProofUrl) ?? rawProofUrl) : "";
  const representative = assignedRepresentativeId(order) ? representativeName(order) : "المندوب غير محدد";
  const deliveryNote = order.delivery_note?.trim();
  return (
    <Card className="overflow-hidden text-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4">
        <span className="inline-flex items-center gap-2 font-semibold"><ImageIcon className="size-4 text-primary" />إثبات التسليم</span>
        <Badge tone={proofUrl ? "green" : "secondary"}>{proofUrl ? "تم الرفع" : "غير مرفوع"}</Badge>
      </div>
      <div className="grid gap-3 p-5">
        {proofUrl ? (
          <a href={proofUrl} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border bg-muted/20 outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/30" aria-label={`فتح صورة إثبات تسليم الطلب ${orderNumber(order)} بالحجم الكامل`}>
            <DashboardImage src={proofUrl} fallbackSrc="/images/placeholders/default_offer.webp" alt={`صورة إثبات تسليم الطلب ${orderNumber(order)}`} width={720} height={960} sizes="(max-width: 1280px) 100vw, 360px" className="aspect-[4/3] w-full bg-background" imageClassName="object-contain" />
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-semibold text-white opacity-90 transition group-hover:opacity-100"><ExternalLink className="size-3.5" />فتح بالحجم الكامل</span>
          </a>
        ) : (
          <div className="grid min-h-28 place-items-center gap-2 rounded-lg border border-dashed bg-muted/15 p-4 text-center text-muted-foreground">
            <ImageIcon className="size-7 opacity-60" />
            <p className="text-xs leading-5">{order.status === "delivered" ? "تم تسليم الطلب بدون صورة إثبات." : "ستظهر هنا الصورة التي يرفعها المندوب عند تأكيد التسليم."}</p>
          </div>
        )}
        <div className="rounded-md border bg-muted/10 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <div>المندوب: <span className="font-semibold text-foreground">{representative}</span></div>
          {order.delivered_at ? <div>وقت التسليم: {dateTime(order.delivered_at)}</div> : null}
        </div>
        {deliveryNote ? <div className="rounded-md border bg-muted/10 px-3 py-2"><div className="mb-1 text-xs font-semibold text-muted-foreground">ملاحظة المندوب</div><p className="whitespace-pre-wrap leading-6">{deliveryNote}</p></div> : null}
      </div>
    </Card>
  );
}
