"use client";

import Link from "next/link";
import { Eye, KeyRound, Pencil, Plus, Send, Truck, UserRoundPlus } from "lucide-react";

import { DashboardImage } from "../dashboard-image";
import { Badge, Button, Card, Pagination, Switch } from "../primitives";
import { displayLocalPhone } from "../users/account-fields";
import { fullNameFromBackendUser, type BackendDashboardUser } from "../users/api-users";
import { courierOrderStats } from "./domain";
import type { AdminOrder } from "./types";

export function CouriersTable({ couriers, orders, startIndex, currentPage, totalPages, totalCount, assignableCount, busy, onPageChange, onAssign, onPassword, onAvailabilityChange }: {
  couriers: BackendDashboardUser[];
  orders: AdminOrder[];
  startIndex: number;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  assignableCount: number;
  busy: string | null;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
  onAssign: (courier: BackendDashboardUser) => void;
  onPassword: (courier: BackendDashboardUser) => void;
  onAvailabilityChange: (courier: BackendDashboardUser, checked: boolean) => void;
}) {
  if (!couriers.length) {
    return <Card className="mt-8 overflow-hidden border-dashed bg-card/70"><div className="flex min-h-44 flex-col items-center justify-center gap-4 px-6 py-10 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRoundPlus className="size-7" /></span><div><h3 className="text-lg font-bold text-foreground">لا توجد حسابات طيارين هنا</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">غيّر فلتر المنطقة أو أضف طيارًا جديدًا.</p></div><Link href="/delivery/couriers/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"><Plus className="size-4" />أضف أول طيار</Link></div></Card>;
  }
  return (
    <div className="mt-8 grid gap-3">
      {couriers.map((courier, index) => {
        const profile = courier.courier_profile;
        const stats = courierOrderStats(orders, courier.id);
        const maxActiveOrders = profile?.max_active_orders ?? 0;
        const hasSignedIn = courier.last_login != null;
        const isAvailable = courier.is_active !== false && profile?.is_available !== false;
        const isAtCapacity = maxActiveOrders > 0 && stats.active >= maxActiveOrders;
        const canAssign = hasSignedIn && isAvailable && !isAtCapacity && assignableCount > 0 && busy === null;
        const disabledReason = !hasSignedIn ? "لم يسجل الحساب بعد" : assignableCount === 0 ? "لا توجد طلبات مؤهلة للإسناد" : !isAvailable ? "الطيار غير متاح" : isAtCapacity ? "الطيار وصل للحد الأقصى للطلبات النشطة" : undefined;
        return (
          <Card key={courier.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(220px,1fr)_320px_400px] xl:items-center">
            <Link href={`/delivery/couriers/${courier.id}`} className="flex min-w-0 items-center gap-3 rounded-lg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25" aria-label={`عرض تفاصيل ${fullNameFromBackendUser(courier)}`}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{startIndex + index + 1}</span>
              <DashboardImage src={courier.avatar_url} placeholderType="courier" alt={fullNameFromBackendUser(courier)} width={56} height={56} className="size-14 shrink-0 overflow-hidden rounded-full" imageClassName="object-cover" />
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{fullNameFromBackendUser(courier)}</h3><Badge tone={!hasSignedIn ? "blue" : courier.is_active === false ? "red" : profile?.is_available === false ? "blue" : "green"}>{!hasSignedIn ? "لم يسجل الحساب بعد" : courier.is_active === false ? "معطل" : profile?.is_available === false ? "غير متاح" : "متاح"}</Badge>{isAtCapacity ? <Badge tone="red">ممتلئ</Badge> : null}</div><p className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">{displayLocalPhone(courier.phone)} - {courier.email}</p><p className="mt-1 truncate text-sm"><Truck className="me-1 inline size-4 text-primary" />{profile?.vehicle_type ?? "غير محدد"} - {profile?.plate_number ?? "بلا لوحة"} - {profile?.service_city_name ?? "بلا مدينة"}</p></div>
            </Link>
            <div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{stats.active}</div><div className="text-xs text-muted-foreground">نشط</div></div><div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{stats.delivered}</div><div className="text-xs text-muted-foreground">تم التسليم</div></div><div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{maxActiveOrders}</div><div className="text-xs text-muted-foreground">السعة</div></div></div>
            <div className="flex flex-nowrap justify-start gap-2 xl:justify-end">
              <div className="flex shrink-0 items-center gap-2 rounded-md border px-2 py-1" title={!hasSignedIn ? "يتاح تغيير التوفر بعد أول تسجيل دخول للحساب." : undefined}><Switch checked={profile?.is_available !== false} disabled={busy !== null || !profile?.service_city || !hasSignedIn} onCheckedChange={(checked) => onAvailabilityChange(courier, checked)} /><span className="text-xs font-semibold">{profile?.is_available === false ? "غير متاح" : "متاح"}</span></div>
              <Link href={`/delivery/couriers/${courier.id}`} className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25" aria-label={`عرض تفاصيل ${fullNameFromBackendUser(courier)}`} title="عرض التفاصيل"><Eye className="size-4" /></Link>
              <Button size="sm" disabled={!canAssign} title={disabledReason} onClick={() => onAssign(courier)}><Send className="size-4" />إسناد</Button>
              <Link href={`/delivery/couriers/${courier.id}/edit`} aria-label="تعديل" title="تعديل" className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"><Pencil className="size-4" /></Link>
              <Button size="icon" variant="outline" disabled={busy !== null} title="تغيير كلمة المرور" aria-label="تغيير كلمة المرور" onClick={() => onPassword(courier)}><KeyRound className="size-4" /></Button>
            </div>
          </Card>
        );
      })}
      <Card className="mt-2 overflow-hidden shadow"><Pagination text={`عرض ${couriers.length} من ${totalCount} نتيجة`} pages={`${currentPage} / ${totalPages}`} previousDisabled={currentPage === 1} nextDisabled={currentPage === totalPages} onPrevious={() => onPageChange((page) => Math.max(1, Math.min(page, totalPages) - 1))} onNext={() => onPageChange((page) => Math.min(totalPages, Math.min(page, totalPages) + 1))} /></Card>
    </div>
  );
}
