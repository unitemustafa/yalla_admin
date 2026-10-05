"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { Button, Card } from "@/features/dashboard/primitives";
import { SafeImage } from "@/components/safe-image";
import { validateImageUpload } from "@/lib/image-upload";
import { mediaSpecHint } from "@/lib/media-specs";
import type { FocalPoint } from "../focal-preview";
import { VideoPreparation, type MediaJob } from "../video-preparation";
import { MediaProcessingStatus } from "../media-processing-status";
import { launchMediaError, mediaSlots, validateLaunchMediaFile, type MediaKey } from "./domain";
import { LoginPreviewDialog } from "./login-preview-dialog";

type Media = Record<`${MediaKey}_url`, string | null> & { market_login_poster_url: string | null; market_login_focus: FocalPoint; delivery_login_focus: FocalPoint };
type MediaDraft = { key: MediaKey; file: File; url: string; focus: FocalPoint };
type Preview = { key: MediaKey; url: string; isVideo: boolean; focus: FocalPoint; draft: boolean; discardDraftOnClose: boolean };

export function AppMediaCard() {
  const { apiFetch } = useAuth();
  const [media, setMedia] = useState<Media | null>(null);
  const [busy, setBusy] = useState<MediaKey | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<MediaDraft | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [videoJob, setVideoJob] = useState<MediaJob | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const imageDraft = draft?.file.type !== "video/mp4" ? draft : null;
  const videoFile = draft?.file.type === "video/mp4" ? draft.file : null;
  const draftUrl = draft?.url;
  useEffect(() => () => { if (draftUrl) URL.revokeObjectURL(draftUrl); }, [draftUrl]);

  async function previewFile(key: MediaKey, file: File | null) {
    if (!file) return;
    const slot = mediaSlots.find((item) => item.key === key)!;
    const issue = validateLaunchMediaFile(key, file) || (file.type !== "video/mp4" ? await validateImageUpload(file, slot.spec) : null);
    if (issue) { setError(issue); return; }
    const focus = media?.[`${key}_focus`] ?? { x: 0.5, y: 0 };
    const url = URL.createObjectURL(file);
    setError(""); setVideoJob(null); setPoster(null);
    setDraft({ key, file, url, focus });
    setPreview({ key, url, isVideo: file.type === "video/mp4", focus, draft: true, discardDraftOnClose: true });
  }

  function openPreview(key: MediaKey) {
    const pending = draft?.key === key ? draft : null;
    const url = pending?.url ?? media?.[`${key}_url`];
    if (!url) return;
    setError("");
    setPreview({ key, url, isVideo: pending ? pending.file.type === "video/mp4" : /\.mp4(?:\?|$)/i.test(url), focus: pending?.focus ?? media?.[`${key}_focus`] ?? { x: 0.5, y: 0 }, draft: Boolean(pending), discardDraftOnClose: false });
  }

  function closePreview() {
    if (busy !== null) return;
    if (preview?.discardDraftOnClose) { setDraft(null); setVideoJob(null); setPoster(null); }
    setPreview(null); setError("");
  }

  async function savePreview(focus: FocalPoint) {
    if (!preview || busy !== null) return;
    if (preview.draft && draft) {
      if (videoFile) {
        setDraft({ ...draft, focus });
        setPreview(null);
      } else if (await change(draft.key, draft.file, false, focus)) setPreview(null);
      return;
    }
    setBusy(preview.key); setError("");
    try {
      const field = `${preview.key}_focus`;
      const response = await apiFetch("dashboard/app-media/", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: focus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(launchMediaError(data, field));
      setMedia(data as Media); setPreview(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ موضع الميديا."); }
    finally { setBusy(null); }
  }

  useEffect(() => {
    let active = true;
    void apiFetch("dashboard/app-media/")
      .then(async (response) => {
        if (!response.ok) throw new Error("تعذر تحميل صور التطبيقات.");
        const data = (await response.json()) as Media;
        if (active) setMedia(data);
      })
      .catch(() => { if (active) setError("تعذر تحميل صور التطبيقات."); });
    return () => { active = false; };
  }, [apiFetch]);

  async function change(key: MediaKey, file: File | null, remove = false, focus = media?.[`${key}_focus`] ?? { x: 0.5, y: 0 }) {
    if (!remove && !file) return;
    const slot = mediaSlots.find((item) => item.key === key)!;
    const fileError = file ? validateLaunchMediaFile(key, file) : null;
    if (fileError) {
      setError(fileError);
      return;
    }
    if (file?.type === "video/mp4") return;
    setBusy(key);
    setError("");
    try {
      if (file && file.type !== "video/mp4") {
        const dimensionError = await validateImageUpload(file, slot.spec);
        if (dimensionError) {
          setError(dimensionError);
          return;
        }
      }
      const form = new FormData();
      const field = key === "market_login" && file?.type === "video/mp4" ? "market_login_video" : key;
      if (file) form.set(field, file);
      if (file) form.set(`${key}_focus`, JSON.stringify(focus));
      const response = await apiFetch("dashboard/app-media/", remove
        ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: null }) }
        : { method: "PATCH", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(launchMediaError(data, field));
      setMedia(data as Media);
      if (draft?.key === key) { setDraft(null); setVideoJob(null); setPoster(null); }
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الملف.");
    } finally {
      setBusy(null);
    }
  }

  async function publishVideo() {
    if (!videoJob || videoJob.state !== "ready" || !videoFile || !draft || busy !== null) return;
    setBusy("market_login"); setError("");
    try {
      const body = new FormData(); body.set("video_job_id", videoJob.id);
      body.set("market_login_focus", JSON.stringify(draft.focus));
      if (poster) body.set("market_login_poster", poster);
      const response = await apiFetch("dashboard/app-media/", { method: "PATCH", body });
      const data = await response.json();
      if (!response.ok) throw new Error(launchMediaError(data, "video_job_id"));
      setMedia(data as Media); setDraft(null); setVideoJob(null); setPoster(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر نشر الفيديو."); }
    finally { setBusy(null); }
  }

  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">صور وفيديوهات بداية التطبيقات</h3>
      <MediaProcessingStatus />
      <p className="mt-1 text-sm text-muted-foreground">تظهر التغييرات عند فتح شاشة تسجيل الدخول من جديد.</p>
      <div className="mt-5 grid gap-4">
        {mediaSlots.map((slot) => {
          const url = imageDraft?.key === slot.key ? imageDraft.url : media?.[`${slot.key}_url`];
          const isVideo = slot.key === "market_login" && !!url && /\.mp4(?:\?|$)/i.test(url);
          const focus = imageDraft?.key === slot.key ? imageDraft.focus : media?.[`${slot.key}_focus`] ?? { x: 0.5, y: 0 };
          const objectPosition = `${focus.x * 100}% ${focus.y * 100}%`;
          const previewHeight = slot.key === "market_login" ? 240 : slot.key === "delivery_login" ? 250 : 384;
          return <div key={slot.key} className="rounded-lg border p-3">
            {slot.key === "market_login" && videoFile ? <><VideoPreparation file={videoFile} slot="market_login" onReady={setVideoJob} onCancel={() => { setDraft(null); setVideoJob(null); setPoster(null); }} /><label className="block text-sm">صورة معاينة بديلة (اختياري)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void validateImageUpload(file, slot.spec).then((issue) => { if (issue) setError(issue); else setPoster(file); }); }} /></label><Button disabled={busy !== null || videoJob?.state !== "ready"} onClick={() => void publishVideo()}>نشر الفيديو الجاهز</Button></> : null}
            <p className="mb-2 text-sm font-semibold">{slot.label}</p>
            {url ? <div className="mb-3 w-full max-w-96 overflow-hidden rounded bg-muted" style={{ aspectRatio: `384 / ${previewHeight}` }}>
              {isVideo
                ? <video controls className="size-full object-cover" style={{ objectPosition }} src={url} />
                : <SafeImage alt={slot.label} className={`size-full ${slot.spec.fit === "contain" ? "object-contain" : "object-cover"}`} style={{ objectPosition }} src={url} width={384} height={previewHeight} />}
            </div> : <p className="mb-3 text-xs text-muted-foreground">الصورة الافتراضية في التطبيق مستخدمة حاليًا.</p>}
            <p className="mb-3 text-[10px] leading-4 text-muted-foreground">{mediaSpecHint(slot.spec)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-md border px-3 py-2 text-sm">
                {busy === slot.key ? "جاري الحفظ..." : "اختيار ملف"}
                <input className="sr-only" type="file" accept={slot.accept} disabled={busy !== null} onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void previewFile(slot.key, file);
                }} />
              </label>
              {url || draft?.key === slot.key ? <Button type="button" variant="outline" disabled={busy !== null} onClick={() => openPreview(slot.key)}>🎯 معاينة وضبط المظهر</Button> : null}
              {imageDraft?.key === slot.key ? <><Button disabled={busy !== null} onClick={() => void change(slot.key, imageDraft.file, false, imageDraft.focus)}>نشر الصورة بعد المعاينة</Button><Button variant="outline" disabled={busy !== null} onClick={() => setDraft(null)}>إلغاء التغيير</Button></> : null}
              {url ? <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void change(slot.key, null, true)}>استخدام الافتراضي</Button> : null}
              <span className="text-xs text-muted-foreground">{slot.key === "market_login" ? "MP4 حتى 30 MB أو صورة حتى 5 MB" : "JPG / PNG / WEBP حتى 5 MB"}</span>
            </div>
          </div>;
        })}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {preview ? <LoginPreviewDialog isOpen onClose={closePreview} onSave={savePreview} mediaKey={preview.key} mediaUrl={preview.url} isVideo={preview.isVideo} initialFocus={preview.focus} isSaving={busy !== null} error={error} /> : null}
    </Card>
  );
}
