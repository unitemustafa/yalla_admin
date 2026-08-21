"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Edit,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "../primitives";
import { offerDateLifecycle } from "./domain";
import { MiniIconButton, RefBadge } from "./offer-ui";
import { OfferCountdown, OfferInfoRow, OfferVisual } from "./list-components";
import type { OffersListController } from "./use-offers-list";

export function OfferCardsGrid({ list }: { list: OffersListController }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
      {list.filteredOffers.map((offer) => {
        const Icon = offer.icon;
        const productText = offer.productNames.length
          ? offer.productNames.slice(0, 3).join("، ")
          : offer.productIds.length ? `${offer.productIds.length} منتجات` : "-";
        const isInactive = offer.backendStatus === "inactive";
        const isExpired = offerDateLifecycle(offer.startsAt, offer.endsAt) === "expired";
        const placement = [
          offer.showInGeneral ? "عام" : "",
          offer.serviceCityIds.length ? offer.serviceCityName : "",
        ].filter(Boolean).join(" + ") || "غير محدد";
        const collapsed = !list.expandedIds[offer.id];

        return (
          <Card
            key={offer.id}
            className={cn(
              "overflow-hidden rounded-lg transition hover:border-primary/35 hover:bg-accent/20",
              isInactive && "border-muted-foreground/20 bg-muted/20 opacity-60 grayscale",
              isExpired && "border-destructive/50 bg-destructive/10 hover:border-destructive/70 hover:bg-destructive/15",
            )}
          >
            <div className={cn("flex flex-col p-4", collapsed ? "min-h-0" : "min-h-[410px]")}>
              {collapsed ? null : <OfferVisual offer={offer} now={list.now} className="h-36" />}
              <div className={cn("flex items-start justify-between gap-3", collapsed ? "mt-0" : "mt-4")}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md", offer.iconBg, offer.accent)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">#{offer.id}</div>
                    <h3 className="mt-1 truncate text-base font-semibold">{offer.title}</h3>
                  </div>
                </div>
                <MiniIconButton
                  ariaLabel={collapsed ? "فتح تفاصيل العرض" : "طي تفاصيل العرض"}
                  onClick={() => list.toggleExpanded(offer.id)}
                >
                  <ChevronDown className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
                </MiniIconButton>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <RefBadge tone="gray">{offer.type}</RefBadge>
                <RefBadge tone="blue">{placement}</RefBadge>
                <RefBadge tone={
                  offer.status === "نشط" ? "green" :
                    offer.status === "منتهي" ? "red" :
                      offer.status === "مجدول" ? "orange" : "yellow"
                }>
                  {offer.status}
                </RefBadge>
              </div>

              {collapsed ? null : (
                <div className="mt-5 grid gap-3 text-sm">
                  <div className="rounded-md bg-muted/25 px-3 py-2">
                    <div className="text-xs text-muted-foreground">الوصف</div>
                    <div className="mt-1 line-clamp-2 font-medium">{offer.description || "-"}</div>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <OfferInfoRow label="السوق" value={offer.marketName} />
                    <OfferInfoRow
                      label="النطاق"
                      value={[
                        offer.showInGeneral ? "عام" : "",
                        offer.serviceCityIds.length ? "مدن خدمة" : "",
                      ].filter(Boolean).join(" + ") || "-"}
                    />
                    {offer.serviceCityIds.length ? (
                      <OfferInfoRow label="مدن الخدمة" value={offer.serviceCityName} />
                    ) : null}
                    <OfferInfoRow label="المنتجات" value={productText} />
                    <OfferInfoRow label="حد الاستخدام" value={offer.useLimits} />
                    <OfferInfoRow label="حد العميل" value={offer.userLimit} />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-3 py-2">
                    <span className="text-muted-foreground">الفترة</span>
                    <span className="text-end font-medium">{offer.period}</span>
                  </div>
                  <OfferCountdown endsAt={offer.endsAt} now={list.now} />
                  <OfferInfoRow
                    label="آخر إرسال"
                    value={offer.lastNotificationSentAt
                      ? new Date(offer.lastNotificationSentAt).toLocaleString("ar-EG")
                      : "لم يُرسل"}
                  />
                  <OfferInfoRow label="عدد مرات الإرسال" value={String(offer.notificationSendCount)} />
                </div>
              )}

              <div className={cn("flex items-center justify-between border-t pt-4", collapsed ? "mt-4" : "mt-auto")}>
                <span className="text-xs text-muted-foreground">إجراءات العرض</span>
                <div className="flex items-center gap-1">
                  {list.showArchived ? (
                    <MiniIconButton
                      tone="green"
                      ariaLabel={`استعادة العرض ${offer.title}`}
                      onClick={() => void list.restore(offer)}
                    >
                      <ArchiveRestore className="size-4" />
                    </MiniIconButton>
                  ) : (
                    <>
                      <MiniIconButton
                        tone="green"
                        ariaLabel={
                          offer.effectiveStatus === "scheduled" ? "يمكن إرسال الإشعار بعد بداية العرض." :
                            offer.effectiveStatus === "expired" ? "عدّل توقيت العرض أولًا." :
                              offer.effectiveStatus === "inactive" ? "فعّل العرض أولًا." : "إرسال إشعار"
                        }
                        disabled={!offer.canSendNotification || list.sendingIds.has(offer.id)}
                        onClick={() => void list.sendNotification(offer)}
                      >
                        <Megaphone className={cn("size-4", list.sendingIds.has(offer.id) && "animate-pulse")} />
                      </MiniIconButton>
                      {offer.backendStatus === "inactive" ? (
                        <MiniIconButton tone="green" ariaLabel="تشغيل العرض" onClick={() => void list.toggleStatus(offer.id)}>
                          <PlayCircle className="size-4" />
                        </MiniIconButton>
                      ) : offer.backendStatus === "active" ? (
                        <MiniIconButton tone="orange" ariaLabel="إيقاف العرض مؤقتا" onClick={() => void list.toggleStatus(offer.id)}>
                          <PauseCircle className="size-4" />
                        </MiniIconButton>
                      ) : null}
                      <MiniIconButton ariaLabel="تعديل العرض" onClick={() => list.edit(offer)}>
                        <Edit className="size-4" />
                      </MiniIconButton>
                      <MiniIconButton
                        tone="red"
                        ariaLabel={offer.deletionMode === "archive" ? "أرشفة العرض" : "حذف العرض نهائيًا"}
                        onClick={() => list.setDeleteTarget(offer)}
                      >
                        {offer.deletionMode === "archive" ? <Archive className="size-4" /> : <Trash2 className="size-4" />}
                      </MiniIconButton>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
