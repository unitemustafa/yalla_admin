"use client";

import { AlertTriangle, BellRing, CheckCircle2, Loader2, PackageCheck, RefreshCw, Send, ShieldAlert, XCircle } from "lucide-react";

import { Badge, Button } from "../primitives";
import { representativeId } from "./domain";
import { InlineError } from "./inline-error";
import { OrderReviewDetails } from "./order-review-details";
import { RepresentativeOptionCard } from "./representative-option-card";
import { useOrderReviewBlocker } from "./use-order-review-blocker";

export function OrderReviewBlocker() {
  const state = useOrderReviewBlocker();
  if (!state.shouldRun || !state.modalActive) return null;
  const selectingRepresentative =
    state.currentOrderNeedsRepresentative &&
    (state.phase === "selecting_representative" || state.phase === "assigning");

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-none bg-foreground/30 px-4 py-5 backdrop-blur-[1px] sm:px-6">
      <section role="dialog" aria-modal="true" aria-labelledby="admin-order-review-blocker-title" className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-5xl items-center">
        <div className="my-auto w-full overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl">
          <header className="border-b border-border bg-card px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="red"><span className="inline-flex items-center gap-1.5"><BellRing className="size-3.5" />طلب جديد يحتاج مراجعة</span></Badge>
                  <Badge tone="secondary">عدد الطلبات المعلقة: {state.pendingLabel}</Badge>
                </div>
                <h2 id="admin-order-review-blocker-title" className="text-xl font-extrabold tracking-normal sm:text-2xl">مراجعة طلب قبل متابعة استخدام لوحة التحكم</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">يجب قبول الطلب أو رفضه قبل الرجوع للوحة التحكم، ويتم إسناد الطيار فقط للطلبات التي تحتاج ذلك.</p>
              </div>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300"><ShieldAlert className="size-6" /></span>
            </div>
          </header>

          <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto px-5 py-5 sm:px-6">
            {state.error ? <InlineError className="mb-4">{state.error}</InlineError> : null}
            {!state.currentOrder ? (
              <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                <div>
                  <AlertTriangle className="mx-auto size-9 text-destructive" />
                  <h3 className="mt-3 text-lg font-bold">تعذر عرض تفاصيل الطلب</h3>
                  <p className="mt-2 text-sm text-muted-foreground">يوجد طلب معلق حسب نظام الحظر، لكن تفاصيله غير متاحة للواجهة.</p>
                  <Button type="button" variant="outline" className="mt-4" disabled={state.loading} onClick={() => void state.loadBlocker({ ignoreBusy: true })}>{state.loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}إعادة الفحص</Button>
                </div>
              </div>
            ) : selectingRepresentative ? (
              <RepresentativeSelection state={state} />
            ) : (
              <div className="grid gap-5">
                <OrderReviewDetails order={state.currentOrder} />
                {state.confirmReject ? (
                  <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4">
                    <div className="flex items-start gap-3"><XCircle className="mt-0.5 size-5 shrink-0 text-destructive" /><div><h3 className="font-bold text-red-700 dark:text-red-200">هل أنت متأكد من رفض الطلب؟</h3><p className="mt-1 text-sm text-red-700/80 dark:text-red-200/80">سيتم رفض الطلب مباشرة بدون طلب سبب من الإدارة.</p></div></div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <footer className="border-t border-border bg-card px-5 py-4 sm:px-6">
            {selectingRepresentative ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" disabled={state.phase === "assigning"} onClick={() => void state.saveApprovedOrder()}><CheckCircle2 className="size-4" />حفظ الطلب</Button>
                <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400" disabled={!state.selectedRepresentativeId || state.phase === "assigning"} onClick={() => void state.assignRepresentative()}>{state.phase === "assigning" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}إرسال للطيار</Button>
              </div>
            ) : state.confirmReject ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" disabled={state.phase === "rejecting"} onClick={() => state.setConfirmReject(false)}>إلغاء</Button>
                <Button type="button" variant="danger" disabled={state.phase === "rejecting"} onClick={() => void state.rejectCurrentOrder()}>{state.phase === "rejecting" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}تأكيد الرفض</Button>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" disabled={state.loading} onClick={() => void state.loadBlocker({ ignoreBusy: true })}>{state.phase === "checking" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}تحديث</Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="danger" disabled={!state.canUseMainActions || state.loading} onClick={() => state.setConfirmReject(true)}><XCircle className="size-4" />رفض الطلب</Button>
                  <Button type="button" disabled={!state.canUseMainActions || state.loading} className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400" onClick={() => void state.approveCurrentOrder()}>{state.phase === "approving" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}قبول الطلب</Button>
                </div>
              </div>
            )}
          </footer>
        </div>
      </section>
    </div>
  );
}

type BlockerState = ReturnType<typeof useOrderReviewBlocker>;

function RepresentativeSelection({ state }: { state: BlockerState }) {
  return (
    <div className="grid gap-5">
      {state.orderSummary ? (
        <div className="rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm"><PackageCheck className="size-4 text-primary" /><span className="font-bold">تم قبول الطلب</span><span dir="ltr" className="font-semibold text-primary">#{state.orderSummary.id}</span><span className="text-muted-foreground">{state.orderSummary.customer} - {state.orderSummary.market}</span><Badge tone="secondary">{state.orderSummary.scope}</Badge><Badge tone={state.orderSummary.marketMode === "متعدد المحلات" ? "green" : "secondary"}>{state.orderSummary.marketMode}</Badge><span className="text-muted-foreground">عدد المحلات: {state.orderSummary.marketCount || "-"}</span><Badge tone={state.orderSummary.delivery.tone}>{state.orderSummary.delivery.type}</Badge><span className="text-muted-foreground">{state.orderSummary.delivery.destination}</span></div>
        </div>
      ) : null}
      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-lg font-bold">اختيار الطيار</h3><p className="text-sm text-muted-foreground">{state.currentOrderIsGeneral ? "طلب عام - اختر أي طيار متاح يدوياً" : "اختر طيارًا من نفس مدينة الخدمة لإرسال الطلب."}</p></div>
          <Button type="button" variant="outline" disabled={state.representativesLoading || state.phase === "assigning"} onClick={() => void state.refreshRepresentatives()}>{state.representativesLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}تحديث الطيارين</Button>
        </div>
        {state.representatives.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center text-sm font-semibold text-muted-foreground">{state.currentOrderIsGeneral ? "لا يوجد طيارين متاحين حاليًا." : "لا يوجد طيارين متاحين لهذه المدينة حاليًا."}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {state.representatives.map((representative, index) => {
              const id = representativeId(representative);
              return <RepresentativeOptionCard key={id || index} representative={representative} selected={id === state.selectedRepresentativeId} disabled={state.phase === "assigning"} onSelect={() => state.setSelectedRepresentativeId(id)} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
