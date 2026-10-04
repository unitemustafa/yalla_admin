import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ServiceCity } from "../cities/types";
import { FormCard, Switch } from "../primitives";
import type { CampaignForm } from "./domain";

export function CampaignVisibilitySection({ form, cities, loading, error, onChange }: {
  form: CampaignForm;
  cities: ServiceCity[];
  loading: boolean;
  error: string | null;
  onChange: (patch: Partial<CampaignForm>) => void;
}) {
  return (
    <FormCard title="نطاق الظهور">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
          <span className="text-sm font-semibold">يظهر في جاهز للشحن</span>
          <Switch aria-label="يظهر في جاهز للشحن" checked={form.show_in_general} disabled={form.show_in_service_city} onCheckedChange={(checked) => onChange({ show_in_general: checked, service_city_id: "" })} />
        </label>
        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
          <span className="text-sm font-semibold">يظهر في المدن</span>
          <Switch aria-label="يظهر في المدن" checked={form.show_in_service_city} disabled={form.show_in_general} onCheckedChange={(checked) => onChange({ show_in_service_city: checked, service_city_id: "" })} />
        </label>
      </div>
      {form.show_in_service_city ? (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3 text-sm font-medium"><span>المدن</span><span className="text-xs text-primary">{form.service_city_id ? 1 : 0} مدينة</span></div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading || error || cities.length === 0 ? (
              <div role={error ? "alert" : undefined} className="flex min-h-14 items-center justify-center rounded-md border bg-muted/20 p-3 text-xs font-semibold text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-4">
                {loading ? "جاري تحميل المدن..." : error || "لا توجد مدن خدمة نشطة."}
              </div>
            ) : cities.map((city) => {
              const cityId = String(city.id);
              const selected = form.service_city_id === cityId;
              const disabled = Boolean(form.service_city_id) && !selected;
              return (
                <button key={city.id} type="button" aria-pressed={selected} disabled={disabled} onClick={() => onChange({ service_city_id: selected ? "" : cityId })} className={cn(
                  "flex h-14 w-full items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold shadow-sm transition",
                  selected ? "border-primary bg-primary/10 text-primary" : disabled ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60" : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                )}>
                  <span className="truncate">{city.name}</span>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40 text-transparent")}><CheckCircle2 className="size-3.5" /></span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </FormCard>
  );
}
