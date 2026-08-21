import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Field, FormCard, Input, Switch } from "../primitives";
import { OfferImageField } from "./offer-image-field";
import { RefBadge, Textarea } from "./offer-ui";
import type { CreateOfferFormController } from "./use-create-offer-form";

export function OfferBasicSection({ form }: { form: CreateOfferFormController }) {
  const { state } = form;
  const editMode = Boolean(state.editingOfferId);
  return (
    <FormCard
      title="البيانات الأساسية"
      right={editMode ? <RefBadge tone="blue">#{state.editingOffer?.id}</RefBadge> : null}
    >
      <div className="grid gap-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="العنوان بالعربي *">
            <Input
              dir="rtl"
              value={state.title}
              onChange={(event) => form.patchState({ title: event.target.value })}
              className="h-[92px] py-2 text-start"
              placeholder="مثلاً: خصم 20% على البيتزا"
            />
          </Field>
          <Field label="الوصف بالعربي">
            <Textarea
              dir="rtl"
              minHeight="min-h-[92px]"
              value={state.description}
              onChange={(event) => form.patchState({ description: event.target.value })}
              placeholder="وصف مختصر يظهر للعميل..."
            />
          </Field>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 lg:col-span-2">
            <div className="text-sm font-medium">نطاق العرض *</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
                <span className="text-sm font-semibold">يظهر في العام</span>
                <Switch
                  checked={state.appearsInGeneral}
                  disabled={state.appearsInServiceCity}
                  onCheckedChange={form.setGeneralEnabled}
                />
              </label>
              <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
                <span className="text-sm font-semibold">يظهر في المدن</span>
                <Switch
                  checked={state.appearsInServiceCity}
                  disabled={state.appearsInGeneral}
                  onCheckedChange={form.setServiceCityEnabled}
                />
              </label>
            </div>
          </div>

          {state.appearsInServiceCity ? (
            <div className="grid gap-3 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">المدن</div>
                <RefBadge tone="blue">{state.serviceCityIds.length} مدينة</RefBadge>
              </div>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {form.citiesLoading ? (
                  <div className="flex h-14 items-center justify-center rounded-md border bg-muted/20 text-xs font-semibold text-muted-foreground">
                    جاري تحميل المدن...
                  </div>
                ) : form.cities.length ? (
                  form.cities.filter((city) => city.is_active !== false).map((city) => {
                    const cityId = String(city.id);
                    const selected = state.serviceCityIds.includes(cityId);
                    return (
                      <button
                        key={city.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={state.serviceCityIds.length > 0 && !selected}
                        onClick={() => form.changeCity(cityId)}
                        className={cn(
                          "flex h-14 w-full items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold shadow-sm transition",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : state.serviceCityIds.length > 0
                              ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60"
                              : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                        )}
                      >
                        <span className="truncate">{city.name}</span>
                        <span className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/40 text-transparent",
                        )}>
                          <CheckCircle2 className="size-3.5" />
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex h-14 items-center justify-center rounded-md border bg-muted/20 text-xs font-semibold text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-4">
                    لا توجد مدن خدمة نشطة.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <OfferImageField form={form} />
      </div>
    </FormCard>
  );
}
