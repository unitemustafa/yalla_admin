"use client";

import { Field, FormCard } from "../primitives";
import { ScheduleDateField, ScheduleTimeField } from "./schedule-fields";
import type { CreateOfferFormController } from "./use-create-offer-form";

export function OfferScheduleSection({ form }: { form: CreateOfferFormController }) {
  const { state } = form;
  return (
    <FormCard title="الجدولة">
      <div className="grid gap-4 lg:grid-cols-4">
        <Field label="تاريخ البداية *">
          <ScheduleDateField
            value={state.startDate}
            onChange={(startDate) => form.patchState({ startDate })}
            ariaLabel="تاريخ البداية"
            rangeStart={state.startDate}
            rangeEnd={state.endDate}
            open={state.openScheduleDate === "start"}
            onOpenChange={(open) => form.setScheduleDateOpen("start", open)}
          />
        </Field>
        <Field label="تاريخ النهاية *">
          <ScheduleDateField
            value={state.endDate}
            onChange={(endDate) => form.patchState({ endDate })}
            ariaLabel="تاريخ النهاية"
            rangeStart={state.startDate}
            rangeEnd={state.endDate}
            open={state.openScheduleDate === "end"}
            onOpenChange={(open) => form.setScheduleDateOpen("end", open)}
          />
        </Field>
        <Field label="بداية الوقت">
          <ScheduleTimeField
            value={state.startTime}
            onChange={(startTime) => form.patchState({ startTime })}
            ariaLabel="بداية الوقت"
            open={state.openScheduleTime === "start"}
            onOpenChange={(open) => form.setScheduleTimeOpen("start", open)}
          />
        </Field>
        <Field label="نهاية الوقت">
          <ScheduleTimeField
            value={state.endTime}
            onChange={(endTime) => form.patchState({ endTime })}
            ariaLabel="نهاية الوقت"
            open={state.openScheduleTime === "end"}
            onOpenChange={(open) => form.setScheduleTimeOpen("end", open)}
          />
        </Field>
      </div>
    </FormCard>
  );
}
