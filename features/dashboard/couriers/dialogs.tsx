"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Search, Send } from "lucide-react";

import { AppSelect, Button, Field, Input } from "../primitives";
import { passwordRules } from "../users/account-fields";
import { fullNameFromBackendUser, type BackendDashboardUser } from "../users/api-users";
import { assignmentOrderLabel } from "./domain";
import type { AdminOrder } from "./types";

function Modal({ title, children, maxWidth = "max-w-2xl" }: {
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-[1px]"><div className={`w-full ${maxWidth} rounded-xl border bg-background shadow-2xl`}><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-lg font-bold">{title}</h2></div>{children}</div></div>;
}

export function PasswordDialog({ courier, busy, onClose, onConfirm }: {
  courier: BackendDashboardUser;
  busy: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const checks = passwordRules(password);
  const missingChecks = checks.filter((rule) => !rule.done);
  return (
    <Modal title="تغيير كلمة المرور" maxWidth="max-w-md">
      <div className="space-y-4 p-5">
        <div className="rounded-lg border bg-muted/30 px-4 py-3"><div className="text-xs text-muted-foreground">المندوب</div><div className="mt-1 font-bold">{fullNameFromBackendUser(courier)}</div></div>
        <Field label="كلمة المرور الجديدة"><div className="relative"><Input type={visible ? "text" : "password"} dir="rtl" minLength={8} value={password} onChange={(event) => setPassword(event.target.value.replace(/\s/g, ""))} className="h-11 pe-11 text-right" /><button type="button" aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setVisible((current) => !current)} className="absolute end-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground">{visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></div>{missingChecks.length ? <div className="mt-2 grid gap-1 text-xs font-semibold text-destructive">{missingChecks.map((rule) => <span key={rule.label}>• {rule.label}</span>)}</div> : null}</Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" disabled={busy || !checks.every((rule) => rule.done)} onClick={() => onConfirm(password)}>{busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}حفظ كلمة المرور</Button></div>
      </div>
    </Modal>
  );
}

export function AssignmentDialog({ courier, orders, selectedOrder, search, busy, onSelectedOrderChange, onSearchChange, onConfirm }: {
  courier: BackendDashboardUser;
  orders: AdminOrder[];
  selectedOrder: string;
  search: string;
  busy: boolean;
  onSelectedOrderChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={`إسناد طلب إلى ${fullNameFromBackendUser(courier)}`}>
      <div className="space-y-4 p-5">
        <div className="relative"><Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="ابحث برقم الطلب أو اسم العميل أو العنوان..." className="h-10 ps-9" /></div>
        <Field label="الطلب المؤهل للإسناد"><AppSelect value={selectedOrder} onValueChange={onSelectedOrderChange} options={orders.map((order) => ({ value: String(order.id), label: assignmentOrderLabel(order, courier) }))} placeholder={orders.length ? "اختر طلبًا" : "لا توجد طلبات مطابقة"} className="h-10 bg-input" contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl" ariaLabel="الطلب المؤهل للإسناد" /></Field>
        <Button className="w-full" type="button" disabled={!selectedOrder || busy} onClick={onConfirm}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}تأكيد الإسناد</Button>
      </div>
    </Modal>
  );
}
