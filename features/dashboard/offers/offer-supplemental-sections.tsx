"use client";

import { Button, Field, FormCard, Input, Switch } from "../primitives";
import { RefBadge } from "./offer-ui";
import type { CreateOfferFormController } from "./use-create-offer-form";

export function OfferNotificationSection({ form }: { form: CreateOfferFormController }) {
  const { state } = form;
  return (
    <FormCard title="إشعارات العرض">
      <label className="flex min-h-20 items-center justify-between gap-4 rounded-md border bg-background px-4 py-3 shadow-sm">
        <span>
          <span className="block text-sm font-semibold">إرسال إشعار للعملاء عند نشر العرض</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            سيصل الإشعار للعملاء الذين اختاروا نفس مدينة العرض.
          </span>
          {state.pushSentAt ? (
            <span className="mt-1 block text-xs font-semibold text-emerald-600">
              تم إرسال إشعار هذا العرض بالفعل.
            </span>
          ) : null}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {state.pushSentAt ? <RefBadge tone="green">تم الإرسال</RefBadge> : null}
          <Switch
            checked={state.sendPushNotification}
            onCheckedChange={(sendPushNotification) => form.patchState({ sendPushNotification })}
          />
        </div>
      </label>
    </FormCard>
  );
}

export function OfferUsageLimitsSection({ form }: { form: CreateOfferFormController }) {
  if (form.state.selectedType === "إعلان") return null;
  return (
    <FormCard title="حدود الاستخدام">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="إجمالي الاستخدام">
          <Input
            className="h-10"
            min="1"
            onChange={(event) => form.patchState({ useLimits: event.target.value })}
            placeholder="غير محدود"
            type="number"
            value={form.state.useLimits}
          />
        </Field>
        <Field label="الحد لكل عميل">
          <Input
            className="h-10"
            min="1"
            onChange={(event) => form.patchState({ userLimit: event.target.value })}
            placeholder="غير محدود"
            type="number"
            value={form.state.userLimit}
          />
        </Field>
      </div>
    </FormCard>
  );
}

export function ClearServiceCitiesDialog({ form }: { form: CreateOfferFormController }) {
  if (!form.state.serviceCityClearConfirmOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-service-cities-title"
        className="w-full max-w-md overflow-hidden rounded-lg border bg-background shadow-2xl"
      >
        <div className="border-b px-5 py-4">
          <h2 id="clear-service-cities-title" className="text-base font-bold">مسح مدن الخدمة المختارة؟</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            إيقاف ظهور العرض في مدن الخدمة هيمسح المدن المختارة وأي منتجات مرتبطة بالنطاق الحالي.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.patchState({ serviceCityClearConfirmOpen: false })}
          >
            إلغاء
          </Button>
          <Button type="button" variant="danger" onClick={form.confirmClearServiceCities}>
            مسح المدن
          </Button>
        </div>
      </div>
    </div>
  );
}
