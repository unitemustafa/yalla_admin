"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  RefreshCcw,
  Search,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  adminApiPaths,
  apiErrorMessage,
  apiList,
  deletionResult,
  readApiData,
  sendAdminJson,
  type BackendRecord,
} from "../admin-api";
import {
  AppSelect,
  Button,
  Card,
  Input,
  PageTitle,
} from "../primitives";
import { cn } from "@/lib/utils";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { useServiceCities } from "../cities-api";
import {
  offerCardFromApi,
  offerDateLifecycle,
  offerTypeOptions,
  offerTypeValues,
  type OfferCard,
} from "./domain";
import {
  MetricCards,
  MiniIconButton,
  OfferCountdown,
  OfferDeleteModal,
  OfferInfoRow,
  OfferVisual,
  RefBadge,
} from "./list-components";

const allOffersFilterValue = "all";
const generalOffersFilterValue = "general";

function translateOfferErrorMessage(message: string) {
  if (/cannot delete offer while orders are using it/i.test(message.trim())) {
    return "لا يمكن حذف العرض لأنه مستخدم في طلبات حالية.";
  }

  return message;
}

function normalizeOfferFilterText(value: string) {
  return value.trim().toLowerCase();
}

export function OffersPage({
  initialArchived = false,
}: {
  initialArchived?: boolean;
} = {}) {
  const router = useRouter();
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const { cities: availableServiceCities } = useServiceCities();
  const [offers, setOffers] = useState<OfferCard[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [offerDeleteTarget, setOfferDeleteTarget] = useState<OfferCard | null>(null);
  const pendingOfferDeletionIdsRef = useRef<Set<string>>(new Set());
  const pendingDispatchIdsRef = useRef<Map<string, string>>(new Map());
  const [sendingOfferIds, setSendingOfferIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState<number | null>(null);
  const [offerSearch, setOfferSearch] = useState("");
  const [offerTypeFilter, setOfferTypeFilter] = useState(allOffersFilterValue);
  const [offerCityFilter, setOfferCityFilter] = useState(allOffersFilterValue);
  const [expandedOfferIds, setExpandedOfferIds] = useState<Record<string, boolean>>({});
  const showArchived = initialArchived;
  const activeOffers = offers.filter(
    (offer) => offer.backendStatus === "active" && offerDateLifecycle(offer.startsAt, offer.endsAt) === "current",
  ).length;
  const scheduledOffers = offers.filter(
    (offer) => offer.backendStatus === "active" && offerDateLifecycle(offer.startsAt, offer.endsAt) === "scheduled",
  ).length;
  const expiredOffers = offers.filter(
    (offer) => offerDateLifecycle(offer.startsAt, offer.endsAt) === "expired",
  ).length;
  const offerCityOptions = useMemo(() => {
    const cityOptions = new Map<string, string>();

    availableServiceCities
      .filter((city) => city.is_active !== false)
      .forEach((city) => {
      cityOptions.set(String(city.id), city.name);
      });

    return [
      { value: allOffersFilterValue, label: "كل المدن" },
      { value: generalOffersFilterValue, label: "عام" },
      ...Array.from(cityOptions, ([value, label]) => ({ value, label })),
    ];
  }, [availableServiceCities]);
  const filteredOffers = useMemo(() => {
    const search = normalizeOfferFilterText(offerSearch);

    return offers.filter((offer) => {
      const matchesSearch =
        !search ||
        [
          offer.id,
          offer.title,
          offer.description,
          offer.type,
          offer.marketName,
          offer.serviceCityName,
          offer.status,
        ].some((value) => normalizeOfferFilterText(value).includes(search));
      const matchesType =
        offerTypeFilter === allOffersFilterValue || offer.apiType === offerTypeFilter;
      const matchesCity =
        offerCityFilter === allOffersFilterValue ||
        (offerCityFilter === generalOffersFilterValue
          ? offer.showInGeneral
          : offer.serviceCityIds.includes(offerCityFilter));
      return matchesSearch && matchesType && matchesCity;
    });
  }, [offers, offerSearch, offerTypeFilter, offerCityFilter]);

  useEffect(() => {
    const updateCountdown = () => setNow(Date.now());
    const timeoutId = window.setTimeout(updateCountdown, 0);
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  const reloadOffers = useCallback(async () => {
    setOffersLoading(true);
    setOffersError(null);

    try {
      const response = await apiFetch(
        `${adminApiPaths.offers}${showArchived ? "?archived=true" : ""}`,
      );
      const data = await readApiData(response);
      if (!response.ok) throw new Error(apiErrorMessage(data, "تعذر تحميل العروض من الباك."));
      setOffers(
        apiList(data)
          .map(offerCardFromApi)
          .filter((offer) => !pendingOfferDeletionIdsRef.current.has(offer.id)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل العروض.";
      setOffersError(message);
      showSnackbar({
        message,
        tone: "danger",
      });
    } finally {
      setOffersLoading(false);
    }
  }, [apiFetch, showArchived, showSnackbar]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reloadOffers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [reloadOffers]);

  async function toggleOfferStatus(offerId: string) {
    const offer = offers.find((item) => item.id === offerId);
    if (!offer) return;
    const nextStatus = offer.backendStatus === "active" ? "inactive" : "active";

    try {
      const data = await sendAdminJson(
        apiFetch,
        `${adminApiPaths.offers}${encodeURIComponent(offerId)}/`,
        { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
      );
      const updated = offerCardFromApi(data as BackendRecord);
    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
          offer.id === offerId ? updated : offer,
      ),
    );
      showSnackbar({ message: "تم تحديث حالة العرض.", tone: "success" });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر تحديث العرض.",
        tone: "danger",
      });
    }
  }

  async function sendOfferNotification(offer: OfferCard) {
    if (!offer.canSendNotification || sendingOfferIds.has(offer.id)) return;
    if (!window.confirm("سيتم إرسال إشعار جديد للعملاء المستهدفين بهذا العرض. الإشعارات السابقة ستظل محفوظة.")) return;
    const requestId = pendingDispatchIdsRef.current.get(offer.id) ?? crypto.randomUUID();
    pendingDispatchIdsRef.current.set(offer.id, requestId);
    setSendingOfferIds((current) => new Set(current).add(offer.id));
    try {
      const data = await sendAdminJson(apiFetch, `${adminApiPaths.offers}${encodeURIComponent(offer.id)}/send-notification/`, {
        method: "POST",
        body: JSON.stringify({ request_id: requestId }),
      }) as BackendRecord;
      pendingDispatchIdsRef.current.delete(offer.id);
      const count = Number(data.notification_count ?? data.recipient_count ?? 0);
      setOffers((current) => current.map((item) => item.id === offer.id ? {
        ...item,
        lastNotificationSentAt: typeof data.sent_at === "string" ? data.sent_at : item.lastNotificationSentAt,
        notificationSendCount: item.notificationSendCount + 1,
      } : item));
      showSnackbar({ message: `تم إرسال الإشعار إلى ${count} عميل.`, tone: "success" });
    } catch (error) {
      showSnackbar({ message: error instanceof Error ? error.message : "تعذر إرسال الإشعار.", tone: "danger" });
    } finally {
      setSendingOfferIds((current) => {
        const next = new Set(current);
        next.delete(offer.id);
        return next;
      });
    }
  }

  function editOffer(offer: OfferCard) {
    showSnackbar({ message: `تم فتح تعديل ${offer.title}.` });
    router.push(`/offers/create?edit=${offer.id}`);
  }

  function toggleOfferCollapsed(offerId: string) {
    setExpandedOfferIds((current) => ({
      ...current,
      [offerId]: !current[offerId],
    }));
  }

  function deleteOffer(offer: OfferCard) {
    const offerIndex = offers.findIndex((currentOffer) => currentOffer.id === offer.id);
    setOfferDeleteTarget(null);
    queueUndoableDelete({
      message: `تمت إزالة العرض ${offer.title} من القائمة مؤقتًا.`,
      onDelete: () => {
        pendingOfferDeletionIdsRef.current.add(offer.id);
        setOffers((currentOffers) =>
          currentOffers.filter((currentOffer) => currentOffer.id !== offer.id),
        );
      },
      onUndo: () => {
        pendingOfferDeletionIdsRef.current.delete(offer.id);
        setOffers((currentOffers) => {
          if (currentOffers.some((currentOffer) => currentOffer.id === offer.id)) {
            return currentOffers;
          }
          const nextOffers = [...currentOffers];
          nextOffers.splice(Math.max(0, offerIndex), 0, offer);
          return nextOffers;
        });
      },
      onCommit: async () => {
        const data = await sendAdminJson(
          apiFetch,
          `${adminApiPaths.offers}${encodeURIComponent(offer.id)}/`,
          { method: "DELETE" },
        );
        return deletionResult(data);
      },
      onCommitSuccess: (value) => {
        const result = deletionResult(value);
        pendingOfferDeletionIdsRef.current.delete(offer.id);
        showSnackbar({
          message:
            result.action === "archived"
              ? result.detail ?? `تمت أرشفة العرض ${offer.title}.`
              : `تم حذف العرض ${offer.title} نهائيًا.`,
          tone: result.action === "archived" ? "success" : "danger",
        });
      },
      onCommitError: (error) => {
        showSnackbar({
          message:
            error instanceof Error
              ? translateOfferErrorMessage(error.message)
              : "تعذر حذف العرض.",
          tone: "danger",
        });
      },
    });
  }

  async function restoreArchivedOffer(offer: OfferCard) {
    const previousOffers = offers;
    setOffers((current) => current.filter((item) => item.id !== offer.id));
    try {
      await sendAdminJson(
        apiFetch,
        `${adminApiPaths.offers}${encodeURIComponent(offer.id)}/`,
        { method: "PATCH", body: JSON.stringify({ restore: true }) },
      );
      showSnackbar({ message: `تمت استعادة العرض ${offer.title}.`, tone: "success" });
    } catch (error) {
      setOffers(previousOffers);
      showSnackbar({
        message: error instanceof Error ? error.message : "تعذر استعادة العرض.",
        tone: "danger",
      });
    }
  }

  return (
    <div className="px-6 py-8">
      <PageTitle
        title={showArchived ? "العروض المؤرشفة" : "العروض"}
        description={
          showArchived
            ? "استعراض العروض المؤرشفة واستعادتها عند الحاجة"
            : "إدارة العروض والخصومات لكل الفروع"
        }
        size="compact"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9" onClick={() => void reloadOffers()} disabled={offersLoading}>
              <RefreshCw className={cn("size-4", offersLoading && "animate-spin")} />
              تحديث
            </Button>
            {!showArchived ? <Link
              href="/offers/create"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              <CheckCircle2 className="size-4" />
              إنشاء عرض
            </Link> : null}
          </div>
        }
      />
      <MetricCards
        cards={[
          ["إجمالي العروض", String(offers.length), Tag, "text-primary"],
          ["نشط", String(activeOffers), CheckCircle2, "text-green-500"],
          ["مجدول", String(scheduledOffers), Calendar, "text-orange-500"],
          ["منتهي", String(expiredOffers), XCircle, "text-destructive"],
        ]}
      />
      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={offerSearch}
              onChange={(event) => setOfferSearch(event.target.value)}
              placeholder="ابحث في العروض..."
              className="h-12 pr-9"
            />
          </div>
          <AppSelect
            value={offerTypeFilter}
            onValueChange={setOfferTypeFilter}
            className="h-12"
            ariaLabel="فلترة حسب نوع العرض"
            options={[
              { value: allOffersFilterValue, label: "كل الأنواع" },
              ...offerTypeOptions.map((option) => ({
                value: offerTypeValues[option.label],
                label: option.label,
              })),
            ]}
          />
          <AppSelect
            value={offerCityFilter}
            onValueChange={setOfferCityFilter}
            className="h-12"
            ariaLabel="فلترة حسب المدينة"
            options={offerCityOptions}
          />
        </div>
        <div className="hidden">
          عرض {filteredOffers.length} من {offers.length} عرض
        </div>
      </Card>
      {offersLoading ? (
        <Card className="mt-6 flex min-h-52 items-center justify-center">
          <Clock className="size-6 animate-spin text-primary" />
        </Card>
      ) : offersError ? (
        <Card className="mt-6 border-destructive/30 bg-destructive/10 shadow-none">
          <div role="alert" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertCircle className="size-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">تعذر تحميل العروض</div>
                <p className="mt-1 text-sm text-muted-foreground">{offersError}</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void reloadOffers()} className="self-start sm:self-center">
              <RefreshCcw className="size-4" />
              إعادة المحاولة
            </Button>
          </div>
        </Card>
      ) : offers.length === 0 ? (
        <Card className="mt-6 flex min-h-[280px] items-center justify-center bg-card shadow">
          <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Tag className="size-8" />
            </div>
            <h2 className="mt-4 text-xl font-semibold leading-7">{showArchived ? "لا توجد عروض مؤرشفة" : "لا توجد عروض حتى الآن"}</h2>
            <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">{showArchived ? "العروض التي تتم أرشفتها ستظهر هنا ويمكن استعادتها." : "سيظهر هنا أول عرض تنشئه للعملاء في تطبيق يلا ماركت."}</p>
            {!showArchived ? <div className="mt-4 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
              <Link href="/offers/create" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
                <Plus className="size-4" />
                إنشاء أول عرض
              </Link>
            </div> : null}
          </div>
        </Card>
      ) : filteredOffers.length === 0 ? (
        <Card className="mt-6 p-6 text-center text-sm text-muted-foreground">
          لا توجد عروض مطابقة للفلاتر الحالية.
        </Card>
      ) : (
      <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {filteredOffers.map((offer) => {
          const Icon = offer.icon;
          const productText = offer.productNames.length
            ? offer.productNames.slice(0, 3).join("، ")
            : offer.productIds.length
              ? `${offer.productIds.length} منتجات`
              : "-";
          const isInactive = offer.backendStatus === "inactive";
          const isExpired = offerDateLifecycle(offer.startsAt, offer.endsAt) === "expired";
          const placement = [
            offer.showInGeneral ? "عام" : "",
            offer.serviceCityIds.length ? offer.serviceCityName : "",
          ].filter(Boolean).join(" + ") || "غير محدد";
          const isCollapsed = !expandedOfferIds[offer.id];

          return (
            <Card
              key={offer.id}
              className={cn(
                "overflow-hidden rounded-lg transition hover:border-primary/35 hover:bg-accent/20",
                isInactive && "border-muted-foreground/20 bg-muted/20 opacity-60 grayscale",
                isExpired && "border-destructive/50 bg-destructive/10 hover:border-destructive/70 hover:bg-destructive/15",
              )}
            >
              <div className={cn("flex flex-col p-4", isCollapsed ? "min-h-0" : "min-h-[410px]")}>
                {isCollapsed ? null : <OfferVisual offer={offer} now={now} className="h-36" />}

                <div className={cn("flex items-start justify-between gap-3", isCollapsed ? "mt-0" : "mt-4")}>
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
                    ariaLabel={isCollapsed ? "فتح تفاصيل العرض" : "طي تفاصيل العرض"}
                    onClick={() => toggleOfferCollapsed(offer.id)}
                  >
                    <ChevronDown className={cn("size-4 transition-transform", isCollapsed && "rotate-180")} />
                  </MiniIconButton>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <RefBadge tone="gray">{offer.type}</RefBadge>
                  <RefBadge tone="blue">{placement}</RefBadge>
                  <RefBadge tone={offer.status === "نشط" ? "green" : offer.status === "منتهي" ? "red" : offer.status === "مجدول" ? "orange" : "yellow"}>
                    {offer.status}
                  </RefBadge>
                </div>

                {isCollapsed ? null : (
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
                  <OfferCountdown endsAt={offer.endsAt} now={now} />
                  <OfferInfoRow label="آخر إرسال" value={offer.lastNotificationSentAt ? new Date(offer.lastNotificationSentAt).toLocaleString("ar-EG") : "لم يُرسل"} />
                  <OfferInfoRow label="عدد مرات الإرسال" value={String(offer.notificationSendCount)} />
                </div>
                )}

                <div className={cn("flex items-center justify-between border-t pt-4", isCollapsed ? "mt-4" : "mt-auto")}>
                  <span className="text-xs text-muted-foreground">إجراءات العرض</span>
                  <div className="flex items-center gap-1">
                    {showArchived ? (
                      <MiniIconButton tone="green" ariaLabel={`استعادة العرض ${offer.title}`} onClick={() => void restoreArchivedOffer(offer)}>
                        <ArchiveRestore className="size-4" />
                      </MiniIconButton>
                    ) : (
                    <>
                    <MiniIconButton
                      tone="green"
                      ariaLabel={offer.effectiveStatus === "scheduled" ? "يمكن إرسال الإشعار بعد بداية العرض." : offer.effectiveStatus === "expired" ? "عدّل توقيت العرض أولًا." : offer.effectiveStatus === "inactive" ? "فعّل العرض أولًا." : "إرسال إشعار"}
                      disabled={!offer.canSendNotification || sendingOfferIds.has(offer.id)}
                      onClick={() => void sendOfferNotification(offer)}
                    >
                      <Megaphone className={cn("size-4", sendingOfferIds.has(offer.id) && "animate-pulse")} />
                    </MiniIconButton>
                    {offer.backendStatus === "inactive" ? (
                      <MiniIconButton
                        tone="green"
                        ariaLabel="تشغيل العرض"
                        onClick={() => toggleOfferStatus(offer.id)}
                      >
                        <PlayCircle className="size-4" />
                      </MiniIconButton>
                    ) : offer.backendStatus === "active" ? (
                      <MiniIconButton
                        tone="orange"
                        ariaLabel="إيقاف العرض مؤقتا"
                        onClick={() => toggleOfferStatus(offer.id)}
                      >
                        <PauseCircle className="size-4" />
                      </MiniIconButton>
                    ) : null}
                    <MiniIconButton ariaLabel="تعديل العرض" onClick={() => editOffer(offer)}>
                      <Edit className="size-4" />
                    </MiniIconButton>
                    <MiniIconButton tone="red" ariaLabel={offer.deletionMode === "archive" ? "أرشفة العرض" : "حذف العرض نهائيًا"} onClick={() => setOfferDeleteTarget(offer)}>
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
      )}
      {offerDeleteTarget ? (
        <OfferDeleteModal
          offer={offerDeleteTarget}
          deleting={false}
          onClose={() => setOfferDeleteTarget(null)}
          onConfirm={() => deleteOffer(offerDeleteTarget)}
        />
      ) : null}
    </div>
  );
}
