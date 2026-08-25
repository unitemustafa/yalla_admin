"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Sparkles, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useServiceCities } from "../cities/use-service-cities";
import { adminApiPaths, apiErrorMessage, apiList, readApiData, sendAdminJson } from "../admin-api";
import { AppSelect, Button, Field, FormCard, Input, PageTitle, Switch } from "../primitives";
import { useSnackbar } from "../snackbar";
import { CampaignPreview } from "./campaign-preview";
import { campaignFromApi, campaignPayload, initialCampaignForm, presets, selectOptions, validateCampaign, type CampaignFiles, type CampaignForm, type CampaignRow, type Option } from "./domain";

const selectClass = "bg-background";
const textareaClass = "min-h-24 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

function SelectField({ label, value, setValue, options }: { label: string; value: string; setValue: (value: string) => void; options: Option[] }) {
  return <Field label={label}><AppSelect value={value} onValueChange={setValue} options={options} className={selectClass} /></Field>;
}

function FileField({ label, accept, hint, onFile }: { label: string; accept: string; hint: string; onFile: (file?: File) => void }) {
  return <Field label={label}><label className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground hover:border-primary"><Upload className="size-4" />اختر ملفًا<input className="sr-only" type="file" accept={accept} onChange={(event) => onFile(event.target.files?.[0])} /></label><span className="text-xs font-normal text-muted-foreground">{hint}</span></Field>;
}

function ColorField({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <Field label={label}><div className="flex gap-2"><input aria-label={label} type="color" value={value} onChange={(event) => setValue(event.target.value)} className="h-9 w-14 rounded border bg-background p-1" /><Input dir="ltr" value={value} onChange={(event) => setValue(event.target.value.toUpperCase())} /></div></Field>;
}

function checkFile(file: File | undefined, kind: "image" | "video") {
  if (!file) return "";
  if (kind === "image" && file.size > 5 * 1024 * 1024) return "حجم الصورة يجب ألا يتجاوز 5MB.";
  if (kind === "video" && (file.type !== "video/mp4" || file.size > 15 * 1024 * 1024)) return "اختر فيديو MP4 لا يتجاوز 15MB و30 ثانية.";
  return "";
}

export function HomeCampaignFormPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { cities } = useServiceCities({ activeOnly: true });
  const [form, setForm] = useState<CampaignForm>(initialCampaignForm);
  const [files, setFiles] = useState<CampaignFiles>({});
  const [existing, setExisting] = useState<CampaignRow>();
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<Record<string, Option[]>>({ offer: [], product: [], market: [], product_category: [] });
  const set = useCallback(<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) => setForm((current) => ({ ...current, [key]: value })), []);

  useEffect(() => {
    let active = true;
    const edit = new URLSearchParams(window.location.search).get("edit") ?? "";
    const stateTimer = window.setTimeout(() => {
      if (!active) return;
      setEditingId(edit);
      if (!edit) setLoading(false);
    }, 0);
    const loadCollection = async (path: string) => {
      const response = await apiFetch(path);
      const data = await readApiData(response);
      if (!response.ok) throw new Error(apiErrorMessage(data, "تعذر تحميل اختيارات الحملة."));
      return apiList(data);
    };
    void Promise.all([
      loadCollection(adminApiPaths.offers), loadCollection(adminApiPaths.products),
      loadCollection(adminApiPaths.markets), loadCollection(adminApiPaths.productCategories),
    ]).then(([offers, products, markets, categories]) => {
      if (!active) return;
      setTargets({ offer: selectOptions(offers, ["title", "name"]), product: selectOptions(products), market: selectOptions(markets), product_category: selectOptions(categories) });
    }).catch((reason: unknown) => showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحميل الاختيارات.", tone: "danger" }));
    if (!edit) return () => { active = false; window.clearTimeout(stateTimer); };
    void apiFetch(`${adminApiPaths.homeCampaigns}${encodeURIComponent(edit)}/`).then(async (response) => {
      const data = await readApiData(response);
      const record = apiList([data])[0];
      if (!response.ok || !record) throw new Error(apiErrorMessage(data, "تعذر تحميل الحملة."));
      if (active) { const parsed = campaignFromApi(record); setExisting(parsed); setForm(parsed); }
    }).catch((reason: unknown) => showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحميل الحملة.", tone: "danger" })).finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.clearTimeout(stateTimer); };
  }, [apiFetch, showSnackbar]);

  const chooseFile = (key: keyof CampaignFiles, kind: "image" | "video") => (file?: File) => {
    const error = checkFile(file, kind);
    if (error) { showSnackbar({ message: error, tone: "danger" }); return; }
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const save = async () => {
    const validation = validateCampaign(form, files, existing);
    if (validation) { showSnackbar({ message: validation, tone: "danger" }); return; }
    setSaving(true);
    try {
      const hasFiles = Object.values(files).some(Boolean);
      const desiredActive = form.is_active;
      const payload = campaignPayload({ ...form, is_active: hasFiles ? false : desiredActive });
      const data = await sendAdminJson(apiFetch, editingId ? `${adminApiPaths.homeCampaigns}${encodeURIComponent(editingId)}/` : adminApiPaths.homeCampaigns, { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      const saved = apiList([data])[0];
      const id = saved ? String(saved.id) : editingId;
      if (!id) throw new Error("لم يرجع الباك معرف الحملة.");
      if (hasFiles) {
        const body = new FormData();
        Object.entries(files).forEach(([key, file]) => { if (file) body.append(key, file); });
        const response = await apiFetch(`${adminApiPaths.homeCampaigns}${encodeURIComponent(id)}/media/`, { method: "POST", body });
        const mediaData = await readApiData(response);
        if (!response.ok) throw new Error(`${apiErrorMessage(mediaData, "فشل رفع الميديا.")} تم حفظ الحملة متوقفة لحمايتها من الظهور ناقصة.`);
        if (desiredActive) await sendAdminJson(apiFetch, `${adminApiPaths.homeCampaigns}${encodeURIComponent(id)}/`, { method: "PATCH", body: JSON.stringify({ is_active: true }) });
      }
      showSnackbar({ message: editingId ? "تم حفظ تعديلات حملة الهوم." : "تم إنشاء حملة الهوم.", tone: "success" });
      window.location.assign("/offers/home-campaigns");
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر حفظ الحملة.", tone: "danger", durationMs: 6000 });
    } finally { setSaving(false); }
  };

  const actionOptions: Option[] = [
    { value: "none", label: "بدون زر" }, { value: "offer", label: "فتح عرض" },
    { value: "product", label: "فتح منتج" }, { value: "market", label: "فتح محل" },
    { value: "product_category", label: "فتح تصنيف منتجات" }, { value: "external_url", label: "رابط HTTPS خارجي" },
    { value: "copy_text", label: "نسخ نص أو كود" },
  ];
  const targetKey = form.action_type as keyof typeof targets;

  if (loading) return <div className="p-8 text-sm text-muted-foreground">جار تحميل الحملة...</div>;
  return <div className="px-6 py-8">
    <PageTitle title={editingId ? "تعديل حملة الهوم" : "إنشاء حملة هوم"} description="حملة مستقلة تظهر فوق شريط التنقل في الصفحة الرئيسية فقط." size="compact" actions={<><Link href="/offers/home-campaigns" className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-4 text-sm"><ChevronRight className="size-4" />الرجوع للحملات</Link><Button onClick={() => void save()} disabled={saving}><CheckCircle2 className="size-4" />{saving ? "جار الحفظ..." : "حفظ الحملة"}</Button></>} />
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-5">
        <FormCard title="قوالب جاهزة" right={<Sparkles className="size-4 text-primary" />}><div className="flex flex-wrap gap-2">{presets.map(([name, patch]) => <Button key={name} type="button" variant="outline" className="h-8" onClick={() => setForm((current) => ({ ...current, ...patch }))}>{name}</Button>)}</div></FormCard>
        <FormCard title="المحتوى"><div className="grid gap-4 md:grid-cols-2"><Field label="الاسم الإداري"><Input value={form.internal_name} onChange={(e) => set("internal_name", e.target.value)} placeholder="مثال: حملة أول طلب - أغسطس" /></Field><Field label="نص الشريط"><Input value={form.teaser_text} onChange={(e) => set("teaser_text", e.target.value)} maxLength={160} /></Field></div><Field label="عنوان النافذة"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field><Field label="الوصف"><textarea className={textareaClass} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field><p className="text-xs text-muted-foreground">المحتوى التسويقي عربي ويظهر كما أدخلته مهما كانت لغة واجهة العميل.</p></FormCard>
        <FormCard title="الميديا"><div className="grid gap-4 md:grid-cols-3"><SelectField label="نوع الميديا" value={form.media_type} setValue={(value) => set("media_type", value)} options={[{ value: "none", label: "بدون ميديا" }, { value: "image", label: "صورة" }, { value: "video", label: "فيديو MP4" }]} /><FileField label="صورة الشريط (اختيارية)" accept="image/jpeg,image/png,image/webp" hint="JPG/PNG/WebP حتى 5MB" onFile={chooseFile("teaser_image", "image")} />{form.media_type === "image" ? <FileField label="صورة النافذة" accept="image/jpeg,image/png,image/webp" hint="حتى 5MB" onFile={chooseFile("sheet_image", "image")} /> : null}</div>{form.media_type === "video" ? <div className="grid gap-4 md:grid-cols-2"><FileField label="الفيديو" accept="video/mp4" hint="MP4 حتى 15MB و30 ثانية" onFile={chooseFile("video", "video")} /><FileField label="Poster الفيديو" accept="image/jpeg,image/png,image/webp" hint="إلزامي؛ حتى 5MB" onFile={chooseFile("video_poster", "image")} /></div> : null}</FormCard>
        <FormCard title="القالب والألوان"><div className="grid gap-4 md:grid-cols-3"><SelectField label="القالب" value={form.template} setValue={(value) => set("template", value)} options={[{ value: "hero", label: "Hero مثل طلبات" }, { value: "split", label: "Split" }, { value: "media_focus", label: "Media Focus" }]} /><SelectField label="حجم النافذة" value={form.sheet_size} setValue={(value) => set("sheet_size", value)} options={[{ value: "medium", label: "متوسط" }, { value: "large", label: "كبير" }, { value: "near_full", label: "شبه كامل" }]} /><SelectField label="محاذاة النص" value={form.content_alignment} setValue={(value) => set("content_alignment", value)} options={[{ value: "start", label: "بداية السطر" }, { value: "center", label: "منتصف" }]} /></div><div className="grid gap-4 md:grid-cols-3"><ColorField label="خلفية الشريط" value={form.teaser_background_color} setValue={(value) => set("teaser_background_color", value)} /><ColorField label="نص الشريط" value={form.teaser_text_color} setValue={(value) => set("teaser_text_color", value)} /><ColorField label="خلفية النافذة" value={form.sheet_background_color} setValue={(value) => set("sheet_background_color", value)} /><ColorField label="نص النافذة" value={form.sheet_text_color} setValue={(value) => set("sheet_text_color", value)} /><ColorField label="خلفية الزر" value={form.button_background_color} setValue={(value) => set("button_background_color", value)} /><ColorField label="نص الزر" value={form.button_text_color} setValue={(value) => set("button_text_color", value)} /></div></FormCard>
        <FormCard title="الإجراء والهدف"><div className="grid gap-4 md:grid-cols-2"><SelectField label="عند الضغط على الزر" value={form.action_type} setValue={(value) => set("action_type", value)} options={actionOptions} />{form.action_type !== "none" ? <Field label="نص الزر"><Input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder="مثال: شوف العرض" /></Field> : null}</div>{["offer", "product", "market", "product_category"].includes(form.action_type) ? <SelectField label="الهدف" value={form[targetKey === "offer" ? "target_offer_id" : targetKey === "product" ? "target_product_id" : targetKey === "market" ? "target_market_id" : "target_product_category_id"] as string} setValue={(value) => set(targetKey === "offer" ? "target_offer_id" : targetKey === "product" ? "target_product_id" : targetKey === "market" ? "target_market_id" : "target_product_category_id", value)} options={targets[targetKey] ?? []} /> : null}{form.action_type === "external_url" ? <Field label="رابط HTTPS"><Input dir="ltr" value={form.external_url} onChange={(e) => set("external_url", e.target.value)} placeholder="https://example.com" /></Field> : null}{form.action_type === "copy_text" ? <Field label="النص أو الكود"><Input value={form.copy_text} onChange={(e) => set("copy_text", e.target.value)} /></Field> : null}{form.action_type === "none" ? <p className="text-sm text-muted-foreground">لن يظهر أي زر داخل النافذة.</p> : null}</FormCard>
        <FormCard title="الجمهور والمدينة"><div className="grid gap-4 md:grid-cols-2"><SelectField label="الجمهور" value={form.audience} setValue={(value) => set("audience", value)} options={[{ value: "all_clients", label: "كل العملاء" }, { value: "new_clients", label: "عميل جديد بلا طلب مكتمل" }, { value: "returning_clients", label: "عميل عائد لديه طلب مكتمل" }]} /><Field label="نطاق الظهور"><div className="flex h-9 items-center justify-between rounded-md border px-3"><span>{form.show_in_general ? "عام" : "مدينة واحدة"}</span><Switch checked={!form.show_in_general} onCheckedChange={(checked) => set("show_in_general", !checked)} /></div></Field></div>{!form.show_in_general ? <SelectField label="مدينة الخدمة" value={form.service_city_id} setValue={(value) => set("service_city_id", value)} options={cities.map((city) => ({ value: String(city.id), label: city.name }))} /> : null}</FormCard>
        <FormCard title="الجدولة والأولوية"><div className="grid gap-4 md:grid-cols-3"><Field label="البداية"><Input type="datetime-local" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} /></Field><Field label="النهاية"><Input type="datetime-local" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} /></Field><Field label="الأولوية"><Input type="number" min="0" value={form.priority} onChange={(e) => set("priority", e.target.value)} /></Field></div><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-bold">تفعيل الحملة</p><p className="text-xs text-muted-foreground">الأعلى أولوية فقط هو الذي يظهر.</p></div><Switch checked={form.is_active} onCheckedChange={(checked) => set("is_active", checked)} /></div></FormCard>
        <FormCard title="سلوك الفتح والإخفاء"><div className="grid gap-4 md:grid-cols-2"><SelectField label="فتح النافذة" value={form.open_mode} setValue={(value) => set("open_mode", value)} options={[{ value: "tap_only", label: "عند الضغط فقط" }, { value: "once_per_session", label: "تلقائي مرة في الجلسة" }, { value: "once_per_day", label: "تلقائي مرة يوميًا" }]} /><SelectField label="بعد الإغلاق" value={form.dismiss_behavior} setValue={(value) => set("dismiss_behavior", value)} options={[{ value: "collapse_only", label: "العودة للشريط" }, { value: "hide_session", label: "إخفاء للجلسة" }, { value: "hide_day", label: "إخفاء ليوم" }]} /></div></FormCard>
      </div>
      <CampaignPreview form={form} files={files} existing={existing} />
    </div>
  </div>;
}
