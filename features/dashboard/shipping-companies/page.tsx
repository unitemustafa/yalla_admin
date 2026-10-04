"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2, Truck } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import { useServiceCities } from "../cities/use-service-cities";
import { PageLoadError } from "../load-error-card";
import { AppSelect, Badge, Button, Card, Input, PageTitle, Pagination, Switch } from "../primitives";
import { useSnackbar } from "../snackbar";
import { deleteShippingCompany, loadShippingCompanies, saveShippingCompany } from "./api";
import { ShippingCompanyFormDialog } from "./form-dialog";
import type { ShippingCompany, ShippingCompanyDraft } from "./types";

const pageSize = 8;

export function ShippingCompaniesPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { cities, loading: citiesLoading } = useServiceCities();
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ShippingCompany | null>(null);
  const [deleting, setDeleting] = useState<ShippingCompany | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try { setCompanies(await loadShippingCompanies(apiFetch)); }
    catch (error) { setCompanies([]); setLoadError(error instanceof Error ? error.message : "تعذر تحميل شركات الشحن."); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => companies.filter((company) => {
    const matchesSearch = !search.trim() || `${company.name} ${company.cityNames.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCity = cityId === "all" || Boolean(company.courierAccountId) || company.cityIds.includes(cityId);
    const matchesStatus = statusFilter === "all" || company.status === statusFilter;
    return matchesSearch && matchesCity && matchesStatus;
  }), [cityId, companies, search, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function save(draft: ShippingCompanyDraft, company?: ShippingCompany) {
    try {
      const saved = await saveShippingCompany(apiFetch, draft, company?.id);
      setCompanies((current) => company
        ? current.map((row) => row.id === saved.id ? saved : row)
        : [saved, ...current]);
      showSnackbar({ message: company ? "تم تحديث شركة الشحن." : "تمت إضافة شركة الشحن.", tone: "success" });
      return true;
    } catch (error) {
      showSnackbar({ message: error instanceof Error ? error.message : "تعذر حفظ شركة الشحن.", tone: "danger" });
      return false;
    }
  }

  async function changeStatus(company: ShippingCompany, active: boolean) {
    setBusyId(company.id);
    const draft: ShippingCompanyDraft = { name: company.name, cityIds: [], status: active ? "active" : "inactive", logoFile: null, removeLogo: false };
    await save(draft, company);
    setBusyId(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const company = deleting; setBusyId(company.id);
    try {
      await deleteShippingCompany(apiFetch, company.id);
      setCompanies((current) => current.filter((row) => row.id !== company.id));
      setDeleting(null);
      showSnackbar({ message: "تم حذف شركة الشحن نهائيًا.", tone: "success" });
    } catch (error) { showSnackbar({ message: error instanceof Error ? error.message : "تعذر حذف شركة الشحن.", tone: "danger" }); }
    finally { setBusyId(null); }
  }


  return (
    <div dir="rtl" className="px-6 py-8">
      <PageTitle title="شركات الشحن" description="إدارة شركات الشحن والمدن التي تخدمها." size="compact" actions={<div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={cn("size-4", loading && "animate-spin")} />تحديث</Button><Button onClick={() => setCreating(true)} disabled={citiesLoading}><Plus className="size-4" />شركة جديدة</Button></div>} />
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="إجمالي الشركات" value={companies.length} /><Metric label="الشركات المفعلة" value={companies.filter((row) => row.status === "active").length} /><Metric label="المدن المغطاة" value={new Set(companies.flatMap((row) => row.cityIds)).size} /></div>
      <Card className="mt-6 grid gap-3 p-4 lg:grid-cols-3">
        <div className="relative"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="ابحث عن شركة شحن" className="ps-9" /></div>
        <AppSelect value={cityId} onValueChange={(value) => { setCityId(value); setPage(1); }} ariaLabel="فلترة المدينة" options={[{ value: "all", label: "جميع المدن" }, ...cities.map((city) => ({ value: String(city.id), label: city.name }))]} />
        <AppSelect value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }} ariaLabel="فلترة الحالة" options={[{ value: "all", label: "كل الحالات" }, { value: "active", label: "مفعلة" }, { value: "inactive", label: "معطلة" }]} />
      </Card>
      {loading ? <div className="mt-4 h-60 animate-pulse rounded-xl bg-muted/30" /> : loadError ? <PageLoadError className="mt-4 min-h-60" onRetry={() => void load()} /> : visible.length ? <div className="mt-4 grid gap-3">{visible.map((company) => <CompanyRow key={company.id} company={company} busy={busyId === company.id} onEdit={() => setEditing(company)} onDelete={() => setDeleting(company)} onStatus={(active) => void changeStatus(company, active)} />)}</div> : <Card className="mt-4 flex min-h-56 flex-col items-center justify-center gap-3 border-dashed text-center"><Truck className="size-10 text-muted-foreground" /><div><div className="font-bold">لا توجد شركات شحن</div><div className="mt-1 text-sm text-muted-foreground">غيّر الفلاتر أو أضف أول شركة.</div></div></Card>}
      {!loading && !loadError ? <Pagination text={`عرض ${visible.length} من ${filtered.length} نتيجة`} pages={`${safePage} / ${totalPages}`} previousDisabled={safePage === 1} nextDisabled={safePage === totalPages} onPrevious={() => setPage((value) => Math.max(1, value - 1))} onNext={() => setPage((value) => Math.min(totalPages, value + 1))} /> : null}
      {creating ? <ShippingCompanyFormDialog cities={cities} onClose={() => setCreating(false)} onSave={(draft) => save(draft)} /> : null}
      {editing ? <ShippingCompanyFormDialog company={editing} cities={cities} onClose={() => setEditing(null)} onSave={(draft) => save(draft, editing)} /> : null}
      {deleting ? <ConfirmDeleteDialog title="حذف شركة الشحن" description={`هل تريد حذف ${deleting.name} نهائيًا؟`} busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={() => void confirmDelete()} /> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <Card className="px-5 py-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></Card>; }

function CompanyRow({ company, busy, onEdit, onDelete, onStatus }: { company: ShippingCompany; busy: boolean; onEdit: () => void; onDelete: () => void; onStatus: (active: boolean) => void }) {
  return <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/25">{company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="size-full object-contain p-1" /> : <Truck className="size-6 text-primary" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{company.name}</h3><Badge tone={company.status === "active" ? "green" : "secondary"}>{company.status === "active" ? "مفعلة" : "معطلة"}</Badge></div><p className="mt-1 truncate text-sm text-muted-foreground">{company.courierAccountId ? "كل المدن" : company.cityNames.join("، ") || "بلا مدن"}</p></div></div><div className="flex items-center justify-end gap-2"><Switch checked={company.status === "active"} onCheckedChange={onStatus} disabled={busy} /><Button size="icon" variant="outline" onClick={onEdit} aria-label="تعديل"><Pencil className="size-4" /></Button>{company.deletionMode === "delete" ? <Button size="icon" variant="outline" onClick={onDelete} aria-label="حذف نهائيًا"><Trash2 className="size-4 text-destructive" /></Button> : null}</div></Card>;
}
