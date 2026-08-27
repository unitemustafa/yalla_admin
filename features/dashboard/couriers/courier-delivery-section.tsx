"use client";

import { AlertCircle, ChevronDown, Loader2, MapPin, Plus, Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ServiceCity } from "../cities/types";
import { AppSelect, Button, Card, Field, Input } from "../primitives";
import type { useCourierForm } from "./use-courier-form";

type CourierForm = ReturnType<typeof useCourierForm>;

export function CourierDeliverySection({ form, cities, onClose }: { form: CourierForm; cities: ServiceCity[]; onClose: () => void }) {
  return (
    <Card className="overflow-hidden border-border/70 shadow-xl shadow-black/5">
      <section className="border-border/70 bg-muted/15 p-5 sm:p-7 lg:p-8">
        <button type="button" onClick={() => form.setDeliveryOpen((open) => !open)} className="mb-6 flex w-full items-start justify-between gap-3 border-b border-border/70 pb-5 text-start"><span className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><Truck className="size-5" /></span><span><span className="block text-lg font-extrabold">بيانات التوصيل</span><span className="mt-1 block text-sm text-muted-foreground">تفاصيل المركبة ونطاق التشغيل الخاص بالطيار.</span></span></span><ChevronDown className={cn("mt-2 size-5 text-muted-foreground transition-transform", form.deliveryOpen && "rotate-180")} /></button>
        {form.submitted && form.deliveryHasErrors ? <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">بيانات التوصيل مطلوبة.</div> : null}
        {form.deliveryOpen ? <div className="grid gap-x-5 gap-y-5 md:grid-cols-2"><Field label="نوع المركبة"><Input required autoComplete="off" placeholder="مثال: دراجة نارية" value={form.draft.vehicleType} onChange={(event) => form.update("vehicleType", event.target.value)} className="h-10 rounded-md" /></Field><Field label="رقم اللوحة"><Input required autoComplete="off" placeholder="مثال: أ ب ج 1234" value={form.draft.plateNumber} onChange={(event) => form.update("plateNumber", event.target.value)} className="h-10 rounded-md" /></Field><Field label="مدينة التشغيل"><AppSelect value={form.draft.serviceCity} onValueChange={(value) => form.update("serviceCity", value)} options={cities.filter((city) => city.is_active !== false).map((city) => ({ value: String(city.id), label: city.name }))} placeholder="اختر مدينة التشغيل" icon={<MapPin className="size-4" />} className="h-10 rounded-md bg-input" contentClassName="rounded-md border-border/80 bg-popover p-1.5 shadow-2xl" ariaLabel="مدينة التشغيل" /></Field><Field label="الحد الأقصى للطلبات"><Input required min={1} type="number" autoComplete="off" value={form.draft.maxActiveOrders} onChange={(event) => form.update("maxActiveOrders", event.target.value)} className="h-10 rounded-md" /></Field></div> : null}
      </section>
      {form.error ? <div role="alert" className="flex items-center gap-2 border-t border-destructive/20 bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive sm:px-8"><AlertCircle className="size-4 shrink-0" />{form.error}</div> : null}
      <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-card px-5 py-5 sm:flex-row sm:justify-end sm:px-8"><Button type="button" variant="outline" onClick={onClose} disabled={form.saving} className="h-9 rounded-md sm:min-w-28">إلغاء</Button><Button disabled={form.saving || form.availabilityBlocksSubmit} className="h-9 rounded-md px-6 sm:min-w-44">{form.saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{form.isEditing ? "حفظ التعديلات" : "إنشاء حساب الطيار"}</Button></div>
    </Card>
  );
}
