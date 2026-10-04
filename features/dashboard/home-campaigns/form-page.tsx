"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Sparkles, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { validateImageUpload } from "@/lib/image-upload";
import { mediaSpecHint, mediaSpecs } from "@/lib/media-specs";
import { useServiceCities } from "../cities/use-service-cities";
import { adminApiPaths, apiErrorMessage, apiList, readApiData, sendAdminJson } from "../admin-api";
import { AppSelect, Button, Field, FormCard, Input, PageTitle, Switch } from "../primitives";
import { useSnackbar } from "../snackbar";
import { VideoPreparation, type MediaJob } from "../video-preparation";
import { CampaignPreview } from "./campaign-preview";
import { CampaignVisibilitySection } from "./campaign-visibility-section";
import { campaignFromApi, campaignPayload, initialCampaignForm, presets, selectOptions, validateCampaign, type CampaignFiles, type CampaignForm, type CampaignRow, type Option } from "./domain";

const selectClass = "bg-background";
const textareaClass = "min-h-24 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

function SelectField({ label, value, setValue, options }: { label: string; value: string; setValue: (value: string) => void; options: Option[] }) {
  return <Field label={label}><AppSelect value={value} onValueChange={setValue} options={options} className={selectClass} /></Field>;
}

function FileField({ label, accept, hint, onFile }: { label: string; accept: string; hint: string; onFile: (file?: File) => void }) {
  return <Field label={label}><label className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground hover:border-primary"><Upload className="size-4" />اختر ملفًا<input className="sr-only" type="file" accept={accept} onChange={(event) => onFile(event.target.files?.[0])} /></label><span className={accept.startsWith("image/") ? "text-[10px] leading-4 font-normal text-muted-foreground" : "text-xs font-normal text-muted-foreground"}>{hint}</span></Field>;
}

function ColorField({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <Field label={label}><div className="flex gap-2"><input aria-label={label} type="color" value={value} onChange={(event) => setValue(event.target.value)} className="h-9 w-14 rounded border bg-background p-1" /><Input dir="ltr" value={value} onChange={(event) => setValue(event.target.value.toUpperCase())} /></div></Field>;
}

function checkFile(file: File | undefined, kind: "image" | "video") {
  if (!file) return "";
  if (kind === "image" && file.size > 5 * 1024 * 1024) return "حجم الصورة يجب ألا يتجاوز 5MB.";
  if (kind === "video" && (file.type !== "video/mp4" || file.size > 30 * 1024 * 1024)) return "اختر فيديو MP4 لا يتجاوز 30MB و30 ثانية.";
  return "";
}

export function HomeCampaignFormPage() {
  const router = useRouter();
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { cities, loading: citiesLoading, error: citiesError } = useServiceCities({ activeOnly: true });
  const [form, setForm] = useState<CampaignForm>(initialCampaignForm);
  const [files, setFiles] = useState<CampaignFiles>({});
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [existing, setExisting] = useState<CampaignRow>();
  const [editingId, setEditingId] = useState("");
  const [videoJob, setVideoJob] = useState<MediaJob | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<Record<string, Option[]>>({ offer: [], product: [], market: [], product_category: [] });
  const set = useCallback(<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) => {
    if (key === "media_type") {
      setFiles((current) => ({ teaser_image: current.teaser_image }));
      setVideoJob(null);
      setRemovedImageIds([]);
    }
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

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

  const chooseFile = (key: keyof CampaignFiles, kind: "image" | "video") => async (file?: File) => {
    const error = checkFile(file, kind);
    if (error) { showSnackbar({ message: error, tone: "danger" }); return; }
    if (file && kind === "image") {
      const spec = key === "teaser_image" ? mediaSpecs.campaignTeaser : mediaSpecs.campaignMedia;
      const dimensionError = await validateImageUpload(file, spec);
      if (dimensionError) { showSnackbar({ message: dimensionError, tone: "danger" }); return; }
    }
    if (key === "video") setVideoJob(null);
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const chooseImages = async (selected: FileList | null) => {
    if (!selected?.length) return;
    const images = Array.from(selected);
    if (images.length + (files.images?.length ?? 0) + (existing?.additional_images.length ?? 0) - removedImageIds.length + (existing?.sheet_image || files.sheet_image ? 1 : 0) > 10) {
      showSnackbar({ message: "الحد الأقصى 10 صور للحملة.", tone: "danger" });
      return;
    }
    for (const image of images) {
      const error = checkFile(image, "image") || await validateImageUpload(image, mediaSpecs.campaignMedia);
      if (error) { showSnackbar({ message: error, tone: "danger" }); return; }
    }
    setFiles((current) => ({ ...current, images: [...(current.images ?? []), ...images] }));
  };

  const save = async () => {
    if (files.video && (!videoJob || videoJob.state !== "ready")) { showSnackbar({ message: "انتظر جاهزية الفيديو قبل الحفظ والنشر.", tone: "danger" }); return; }
    const validation = validateCampaign(form, files, existing, removedImageIds);
    if (validation) { showSnackbar({ message: validation, tone: "danger" }); return; }
    setSaving(true);
    try {
      const hasFiles = Object.entries(files).some(([key, file]) => key === "images" ? (file as File[]).length > 0 : Boolean(file));
      const hasMediaChanges = hasFiles || removedImageIds.length > 0;
      const desiredActive = form.is_active;
      const keepPublished = Boolean(editingId && files.video && existing);
      const payload = campaignPayload({ ...form, media_type: keepPublished ? existing!.media_type : form.media_type, is_active: keepPublished ? existing!.is_active : hasMediaChanges ? false : desiredActive });
      const data = await sendAdminJson(apiFetch, editingId ? `${adminApiPaths.homeCampaigns}${encodeURIComponent(editingId)}/` : adminApiPaths.homeCampaigns, { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      const saved = apiList([data])[0];
      const id = saved ? String(saved.id) : editingId;
      if (!id) throw new Error("لم يرجع الباك معرف الحملة.");
      for (const imageId of removedImageIds) {
        const response = await apiFetch(`${adminApiPaths.homeCampaigns}${encodeURIComponent(id)}/images/${imageId}/`, { method: "DELETE" });
        if (!response.ok) throw new Error("تعذر حذف إحدى صور الحملة.");
      }
      if (hasFiles) {
        const body = new FormData();
        Object.entries(files).forEach(([key, file]) => {
          if (key === "images") (file as File[]).forEach((image) => body.append("images", image));
          else if (key !== "video" && file) body.append(key, file as File);
        });
        if (files.video && videoJob) body.set("video_job_id", videoJob.id);
        const response = await apiFetch(`${adminApiPaths.homeCampaigns}${encodeURIComponent(id)}/media/`, { method: "POST", body });
        const mediaData = await readApiData(response);
        if (!response.ok) throw new Error(`${apiErrorMessage(mediaData, "فشل رفع الميديا.")} ${keepPublished ? "الميديا المنشورة السابقة ما زالت مستخدمة." : "تم حفظ الحملة متوقفة لحمايتها من الظهور ناقصة."}`);
      }
      if (hasMediaChanges) await sendAdminJson(apiFetch, `${adminApiPaths.homeCampaigns}${encodeURIComponent(id)}/`, { method: "PATCH", body: JSON.stringify({ is_active: desiredActive, media_type: form.media_type }) });
      showSnackbar({ message: editingId ? "تم حفظ تعديلات الحملة الإعلانية." : "تم إنشاء الحملة الإعلانية.", tone: "success" });
      router.push("/offers/home-campaigns");
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
    <PageTitle title={editingId ? "تعديل الحملة الإعلانية" : "إنشاء حملة إعلانية"} description="إعلان يظهر في منتصف الشاشة عند فتح التطبيق." size="compact" actions={<><Link href="/offers/home-campaigns" className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-4 text-sm"><ChevronRight className="size-4" />الرجوع للحملات</Link><Button onClick={() => void save()} disabled={saving}><CheckCircle2 className="size-4" />{saving ? "جار الحفظ..." : "حفظ الحملة"}</Button></>} />
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-5">
        <FormCard title="قوالب جاهزة" right={<Sparkles className="size-4 text-primary" />}><div className="flex flex-wrap gap-2">{presets.map(([name, patch]) => <Button key={name} type="button" variant="outline" className="h-8" onClick={() => setForm((current) => ({ ...current, ...patch }))}>{name}</Button>)}</div></FormCard>
        <FormCard title="المحتوى"><div className="grid gap-4 md:grid-cols-2"><Field label="اسم الحملة"><Input value={form.internal_name} onChange={(e) => set("internal_name", e.target.value)} /></Field><Field label="عنوان الإعلان"><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></Field></div><Field label="الوصف"><textarea className={textareaClass} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field></FormCard>
        <FormCard title="الميديا"><SelectField label="نوع الميديا" value={form.media_type} setValue={(value) => set("media_type", value)} options={[{ value: "none", label: "بدون ميديا" }, { value: "image", label: "صور" }, { value: "video", label: "فيديو MP4" }]} />
          {form.media_type === "image" ? <div className="grid gap-3"><FileField label="الصورة الأساسية (اختيارية)" accept="image/jpeg,image/png,image/webp" hint={mediaSpecHint(mediaSpecs.campaignMedia)} onFile={chooseFile("sheet_image", "image")} /><Field label="صور إضافية — تظهر صورة مختلفة في كل فتحة"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { void chooseImages(event.target.files); event.target.value = ""; }} className="w-full rounded-md border p-2 text-sm" /><p className="text-[10px] leading-4 font-normal text-muted-foreground">{mediaSpecHint(mediaSpecs.campaignMedia)}</p></Field>{files.images?.map((image, index) => <div key={`${image.name}-${index}`} className="flex items-center justify-between rounded border p-2 text-sm"><span>{image.name}</span><Button type="button" variant="outline" className="h-8" onClick={() => setFiles((current) => ({ ...current, images: current.images?.filter((_, itemIndex) => itemIndex !== index) }))}>حذف</Button></div>)}{existing?.additional_images.filter((image) => !removedImageIds.includes(image.id)).map((image) => <div key={image.id} className="flex items-center justify-between rounded border p-2 text-sm"><a href={image.url} target="_blank" rel="noreferrer">الصورة #{image.id}</a><Button type="button" variant="outline" className="h-8" onClick={() => setRemovedImageIds((current) => [...current, image.id])}><X className="size-4" /> حذف</Button></div>)}</div> : null}
          {form.media_type === "video" ? <div className="grid gap-4 md:grid-cols-2"><FileField label="الفيديو" accept="video/mp4" hint="MP4 حتى 30MB و30 ثانية" onFile={chooseFile("video", "video")} /><FileField label="صورة الفيديو" accept="image/jpeg,image/png,image/webp" hint={mediaSpecHint(mediaSpecs.campaignMedia)} onFile={chooseFile("video_poster", "image")} /></div> : null}</FormCard>
        <FormCard title="القالب والألوان"><div className="grid gap-4 md:grid-cols-3"><SelectField label="القالب" value={form.template} setValue={(value) => set("template", value)} options={[{ value: "hero", label: "Hero مثل طلبات" }, { value: "split", label: "Split" }, { value: "media_focus", label: "Media Focus" }]} /><SelectField label="حجم النافذة" value={form.sheet_size} setValue={(value) => set("sheet_size", value)} options={[{ value: "medium", label: "متوسط" }, { value: "large", label: "كبير" }, { value: "near_full", label: "شبه كامل" }]} /><SelectField label="محاذاة النص" value={form.content_alignment} setValue={(value) => set("content_alignment", value)} options={[{ value: "start", label: "بداية السطر" }, { value: "center", label: "منتصف" }]} /></div><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-bold">استخدام ألوان ثيم التطبيق</p><p className="text-xs text-muted-foreground">تتحول خلفية النافذة والنص تلقائيًا بين الوضع الفاتح والغامق.</p></div><Switch checked={form.use_theme_colors} onCheckedChange={(checked) => set("use_theme_colors", checked)} /></div><div className="grid gap-4 md:grid-cols-3"><div className={form.use_theme_colors ? "pointer-events-none opacity-45" : ""}><ColorField label="خلفية النافذة" value={form.sheet_background_color} setValue={(value) => set("sheet_background_color", value)} /></div><div className={form.use_theme_colors ? "pointer-events-none opacity-45" : ""}><ColorField label="نص النافذة" value={form.sheet_text_color} setValue={(value) => set("sheet_text_color", value)} /></div><ColorField label="خلفية الزر" value={form.button_background_color} setValue={(value) => set("button_background_color", value)} /><ColorField label="نص الزر" value={form.button_text_color} setValue={(value) => set("button_text_color", value)} /></div></FormCard>
        <FormCard title="الإجراء والهدف"><div className="grid gap-4 md:grid-cols-2"><SelectField label="عند الضغط على الزر" value={form.action_type} setValue={(value) => set("action_type", value)} options={actionOptions} />{form.action_type !== "none" ? <Field label="نص الزر"><Input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} placeholder="مثال: شوف العرض" /></Field> : null}</div>{["offer", "product", "market", "product_category"].includes(form.action_type) ? <SelectField label="الهدف" value={form[targetKey === "offer" ? "target_offer_id" : targetKey === "product" ? "target_product_id" : targetKey === "market" ? "target_market_id" : "target_product_category_id"] as string} setValue={(value) => set(targetKey === "offer" ? "target_offer_id" : targetKey === "product" ? "target_product_id" : targetKey === "market" ? "target_market_id" : "target_product_category_id", value)} options={targets[targetKey] ?? []} /> : null}{form.action_type === "external_url" ? <Field label="رابط HTTPS"><Input dir="ltr" value={form.external_url} onChange={(e) => set("external_url", e.target.value)} placeholder="https://example.com" /></Field> : null}{form.action_type === "copy_text" ? <Field label="النص أو الكود"><Input value={form.copy_text} onChange={(e) => set("copy_text", e.target.value)} /></Field> : null}{form.action_type === "none" ? <p className="text-sm text-muted-foreground">لن يظهر أي زر داخل النافذة.</p> : null}</FormCard>
        <CampaignVisibilitySection form={form} cities={cities} loading={citiesLoading} error={citiesError} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} />
        <FormCard title="الجدولة"><div className="grid gap-4 md:grid-cols-2"><Field label="البداية"><Input type="datetime-local" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} /></Field><Field label="النهاية"><Input type="datetime-local" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} /></Field></div><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-bold">تفعيل الحملة</p><p className="text-xs text-muted-foreground">الحملات النشطة المؤهلة تتناوب تلقائيًا كل 30 دقيقة.</p></div><Switch checked={form.is_active} onCheckedChange={(checked) => set("is_active", checked)} /></div></FormCard>

      </div>
      <div className="space-y-4">{form.media_type === "video" && files.video ? <VideoPreparation file={files.video} slot="campaign" onReady={setVideoJob} onCancel={() => { setVideoJob(null); setFiles((value) => ({ ...value, video: undefined })); }} /> : null}<CampaignPreview form={form} files={files} existing={existing} removedImageIds={removedImageIds} /></div>
    </div>
  </div>;
}
