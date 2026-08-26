import { ImageIcon } from "lucide-react";

import { resolveMediaUrl } from "@/lib/media-url";
import { cleanText } from "../../order-display";
import { Badge, Card } from "../../primitives";
import { orderNumber } from "../formatters";
import type { BackendOrder } from "../types";
import { AuthenticatedOrderImage } from "./authenticated-order-image";

export function OrderAttachmentCard({ order }: { order: BackendOrder }) {
  const rawImageUrl = cleanText(order.image);
  const imageUrl = rawImageUrl ? String(resolveMediaUrl(rawImageUrl) ?? rawImageUrl) : "";

  return (
    <Card className="overflow-hidden text-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4">
        <span className="inline-flex items-center gap-2 font-semibold">
          <ImageIcon className="size-4 text-primary" />صورة الطلب
        </span>
        <Badge tone={imageUrl ? "green" : "secondary"}>{imageUrl ? "مرفقة" : "غير مرفقة"}</Badge>
      </div>
      <div className="p-5">
        {imageUrl ? (
          <AuthenticatedOrderImage
            src={imageUrl}
            alt={`صورة الطلب ${orderNumber(order)} المرسلة من العميل`}
            className="rounded-lg border"
          />
        ) : (
          <div className="grid min-h-28 place-items-center gap-2 rounded-lg border border-dashed bg-muted/15 p-4 text-center text-muted-foreground">
            <ImageIcon className="size-7 opacity-60" />
            <p className="text-xs leading-5">لم يرفق العميل صورة بهذا الطلب.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
