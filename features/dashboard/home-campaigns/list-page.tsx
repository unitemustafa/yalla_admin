"use client";

import Link from "next/link";
import { CalendarClock, Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { adminApiPaths, apiErrorMessage, apiList, readApiData, sendAdminJson } from "../admin-api";
import { Badge, Button, Card, PageTitle, Switch } from "../primitives";
import { useSnackbar } from "../snackbar";
import { campaignFromApi, campaignLabels, type CampaignRow } from "./domain";

const statusTone = { active: "green", scheduled: "blue", expired: "red", inactive: "secondary" } as const;

export function HomeCampaignsPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(adminApiPaths.homeCampaigns);
      const data = await readApiData(response);
      if (!response.ok) throw new Error(apiErrorMessage(data, "تعذر تحميل حملات الهوم."));
      setRows(apiList(data).map(campaignFromApi));
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحميل الحملات.", tone: "danger" });
    } finally { setLoading(false); }
  }, [apiFetch, showSnackbar]);

  useEffect(() => { void Promise.resolve().then(reload); }, [reload]);

  const toggle = async (campaign: CampaignRow, checked: boolean) => {
    try {
      await sendAdminJson(apiFetch, `${adminApiPaths.homeCampaigns}${campaign.id}/`, { method: "PATCH", body: JSON.stringify({ is_active: checked }) });
      showSnackbar({ message: checked ? "تم تفعيل الحملة." : "تم إيقاف الحملة." });
      await reload();
    } catch (reason) { showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحديث الحملة.", tone: "danger" }); }
  };

  const remove = async (campaign: CampaignRow) => {
    if (!window.confirm(`حذف حملة «${campaign.internal_name}» نهائيًا؟`)) return;
    try {
      const response = await apiFetch(`${adminApiPaths.homeCampaigns}${campaign.id}/`, { method: "DELETE" });
      const data = response.status === 204 ? null : await readApiData(response);
      if (!response.ok) throw new Error(apiErrorMessage(data, "تعذر حذف الحملة."));
      setRows((current) => current.filter((row) => row.id !== campaign.id));
      showSnackbar({ message: "تم حذف حملة الهوم." });
    } catch (reason) { showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر حذف الحملة.", tone: "danger" }); }
  };

  return <div className="px-6 py-8">
    <PageTitle title="حملات الهوم" description="إدارة الشريط المثبت والنافذة التي تظهر في Home فقط، بشكل مستقل عن العروض الحالية." size="compact" actions={<><Button variant="outline" onClick={() => void reload()} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button><Link href="/offers/home-campaigns/create" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus className="size-4" />إنشاء حملة هوم</Link></>} />
    <div className="mt-6 grid gap-4">
      {loading ? <Card className="p-8 text-center text-sm text-muted-foreground">جار تحميل الحملات...</Card> : null}
      {!loading && rows.length === 0 ? <Card className="p-10 text-center"><CalendarClock className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="font-bold">لا توجد حملات هوم بعد</h2><p className="mt-1 text-sm text-muted-foreground">أنشئ أول حملة لتظهر فوق شريط التنقل في Home.</p></Card> : null}
      {rows.map((campaign) => <Card key={campaign.id} className="p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-black">{campaign.internal_name}</h2><Badge tone={statusTone[campaign.effective_status]}>{campaignLabels.status[campaign.effective_status]}</Badge></div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{campaign.teaser_text} — {campaign.title}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span>النطاق: {campaign.show_in_general ? "عام" : campaign.service_city_name}</span><span>الميديا: {campaignLabels.media[campaign.media_type as keyof typeof campaignLabels.media] ?? campaign.media_type}</span><span>الإجراء: {campaignLabels.action[campaign.action_type as keyof typeof campaignLabels.action] ?? campaign.action_type}{campaign.target_name !== "—" ? ` — ${campaign.target_name}` : ""}</span><span>الألوان: {campaign.use_theme_colors ? "حسب ثيم التطبيق" : "مخصصة"}</span><span>حتى: {new Date(campaign.end_time).toLocaleString("ar-EG-u-nu-latn")}</span></div>
          </div>
          <div className="flex items-center gap-2"><Switch aria-label="تفعيل الحملة" checked={campaign.is_active} onCheckedChange={(checked) => void toggle(campaign, checked)} /><Link href={`/offers/home-campaigns/create?edit=${encodeURIComponent(campaign.id)}`} className="inline-flex size-9 items-center justify-center rounded-md border hover:bg-accent" aria-label="تعديل"><Edit3 className="size-4" /></Link><Button type="button" variant="outline" className="size-9 p-0 text-destructive" aria-label="حذف" onClick={() => void remove(campaign)}><Trash2 className="size-4" /></Button></div>
        </div>
      </Card>)}
    </div>
  </div>;
}
