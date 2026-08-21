"use client";

import { ChevronRight, ShieldCheck, UserRoundPlus } from "lucide-react";

import type { ServiceCity } from "../cities/types";
import { Button } from "../primitives";
import type { BackendDashboardUser } from "../users/api-users";
import { CourierAccountSection } from "./courier-account-section";
import { CourierAvatarSection } from "./courier-avatar-section";
import { CourierDeliverySection } from "./courier-delivery-section";
import { useCourierForm } from "./use-courier-form";

export function CourierForm({ cities, courier, onClose, onSaved }: {
  cities: ServiceCity[];
  courier: BackendDashboardUser | null;
  onClose: () => void;
  onSaved: (user: BackendDashboardUser) => void;
}) {
  const form = useCourierForm({ cities, courier, onSaved });
  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_32rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:flex"><UserRoundPlus className="size-6" /></div>
            <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><ShieldCheck className="size-3.5" />حساب مندوب موثّق</div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{form.isEditing ? "تعديل بيانات المندوب" : "إضافة مندوب جديد"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{form.isEditing ? "راجع بيانات الحساب والتوصيل، ثم احفظ التغييرات لتحديث ملف المندوب." : "أنشئ حسابًا متكاملًا للمندوب وحدد بيانات مركبته ومنطقة عمله في خطوة واحدة."}</p></div>
          </div>
          <Button type="button" variant="outline" onClick={onClose} className="h-10 self-start rounded-md px-3 lg:self-auto"><ChevronRight className="size-4" />الرجوع إلى المندوبين</Button>
        </header>
        <form onSubmit={form.submit} noValidate autoComplete="off" className="grid items-start gap-6">
          <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><CourierAccountSection form={form} /><CourierAvatarSection form={form} /></div>
          <CourierDeliverySection form={form} cities={cities} onClose={onClose} />
        </form>
      </div>
    </main>
  );
}
