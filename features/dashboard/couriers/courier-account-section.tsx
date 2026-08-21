"use client";

import { Eye, EyeOff, IdCard, KeyRound, Mail, Phone, UserRound } from "lucide-react";

import {
  availabilityMessage,
  passwordRules,
  type AvailabilityField,
  type AvailabilityState,
} from "../users/account-fields";
import { Card, Field, Input } from "../primitives";
import type { useCourierForm } from "./use-courier-form";

type CourierForm = ReturnType<typeof useCourierForm>;

function AvailabilityLine({ field, state, error, showSuccess }: {
  field: AvailabilityField;
  state: AvailabilityState;
  error?: string;
  showSuccess?: boolean;
}) {
  if (error) return <span className="text-xs font-semibold text-destructive">{error}</span>;
  if (state === "checking") return <span className="text-xs font-semibold text-muted-foreground">جاري التحقق...</span>;
  const message = availabilityMessage(field, state);
  if (!message || state === "invalid" || state === "taken" || state === "request_error" || !showSuccess) return null;
  return <span className="text-xs font-semibold text-emerald-600">{message}</span>;
}

function PasswordRequirements({ password, visible }: { password: string; visible: boolean }) {
  const missingRules = passwordRules(password).filter((rule) => !rule.done);
  if (!visible || missingRules.length === 0) return null;
  return <div className="mt-2 grid gap-1 text-xs font-semibold text-destructive">{missingRules.map((rule) => <span key={rule.label}>• {rule.label}</span>)}</div>;
}

export function CourierAccountSection({ form }: { form: CourierForm }) {
  return (
    <Card className="h-full overflow-hidden border-border/70 shadow-xl shadow-black/5">
      <section className="p-5 sm:p-7 lg:p-8">
        <div className="mb-6 flex items-start gap-3 border-b border-border/70 pb-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-5" /></span><div><h2 className="text-lg font-extrabold">بيانات الحساب</h2><p className="mt-1 text-sm text-muted-foreground">معلومات الهوية وبيانات الدخول الأساسية.</p></div></div>
        <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
          <Field label="الاسم الأول"><Input required autoComplete="off" placeholder="مثال: أحمد" value={form.draft.firstName} onChange={(event) => form.update("firstName", event.target.value)} className="h-10 rounded-md" /></Field>
          <Field label="اسم العائلة (اختياري)"><Input autoComplete="off" placeholder="مثال: محمد" value={form.draft.lastName} onChange={(event) => form.update("lastName", event.target.value)} className="h-10 rounded-md" /></Field>
          <Field label="اسم المستخدم *"><div className="space-y-2"><div className="relative"><IdCard className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoComplete="off" dir="ltr" placeholder="اسم فريد لتسجيل الدخول" value={form.draft.username} onFocus={() => form.setFocusedAvailabilityField("username")} onBlur={() => form.setFocusedAvailabilityField(null)} onKeyDown={(event) => { if (event.key === " ") event.preventDefault(); }} onChange={(event) => form.update("username", event.target.value)} className="h-10 rounded-md ps-11 text-right" /></div><AvailabilityLine field="username" state={form.usernameAvailability.state} error={form.errorFor("username")} showSuccess={form.focusedAvailabilityField === "username"} /></div></Field>
          <Field label="رقم الهاتف *"><div className="space-y-2"><div className="relative"><Phone className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoComplete="off" inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" value={form.draft.phone} onFocus={() => form.setFocusedAvailabilityField("phone")} onBlur={() => form.setFocusedAvailabilityField(null)} onChange={(event) => form.update("phone", event.target.value)} className="h-10 rounded-md ps-11 text-right" /></div><AvailabilityLine field="phone" state={form.phoneAvailability.state} error={form.errorFor("phone")} showSuccess={form.focusedAvailabilityField === "phone"} /></div></Field>
          <Field label="البريد الإلكتروني *"><div className="space-y-2"><div className="relative"><Mail className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input required autoComplete="new-password" type="email" dir="ltr" placeholder="name@example.com" value={form.draft.email} onFocus={() => form.setFocusedAvailabilityField("email")} onBlur={() => form.setFocusedAvailabilityField(null)} onKeyDown={(event) => { if (event.key === " ") event.preventDefault(); }} onChange={(event) => form.update("email", event.target.value)} className="h-10 rounded-md ps-11 text-right" /></div><AvailabilityLine field="email" state={form.emailAvailability.state} error={form.errorFor("email")} showSuccess={form.focusedAvailabilityField === "email"} /></div></Field>
          {!form.isEditing ? <Field label="كلمة المرور *"><div className="relative"><KeyRound className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input required autoComplete="new-password" type={form.showPassword ? "text" : "password"} dir="rtl" minLength={8} placeholder="8 أحرف على الأقل" value={form.draft.password} onFocus={() => form.setPasswordFocused(true)} onBlur={() => form.setPasswordFocused(false)} onKeyDown={(event) => { if (event.key === " ") event.preventDefault(); }} onChange={(event) => form.update("password", event.target.value)} className="h-10 rounded-md pe-11 ps-12 text-right" /><button type="button" aria-label={form.showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} title={form.showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => form.setShowPassword((visible) => !visible)} className="absolute start-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{form.showPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></div><PasswordRequirements password={form.draft.password} visible={form.passwordFocused || form.submitted || Boolean(form.draft.password)} /></Field> : null}
        </div>
      </section>
    </Card>
  );
}
