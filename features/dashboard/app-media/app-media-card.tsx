"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { Button, Card } from "@/features/dashboard/primitives";
import { SafeImage } from "@/components/safe-image";
import { validateImageUpload } from "@/lib/image-upload";
import { mediaSpecHint } from "@/lib/media-specs";
import { FocalPreview, type FocalPoint } from "../focal-preview";
import { VideoPreparation, type MediaJob } from "../video-preparation";
import { MediaProcessingStatus } from "../media-processing-status";
import { launchMediaError, mediaSlots, validateLaunchMediaFile, type MediaKey } from "./domain";

type Media = Record<`${MediaKey}_url`, string | null> & { market_login_poster_url: string | null; market_login_focus: FocalPoint; delivery_login_focus: FocalPoint };

export function AppMediaCard() {
  const { apiFetch } = useAuth();
  const [media, setMedia] = useState<Media | null>(null);
  const [busy, setBusy] = useState<MediaKey | null>(null);
  const [error, setError] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoJob, setVideoJob] = useState<MediaJob | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [imageDraft, setImageDraft] = useState<{ key: MediaKey; file: File; url: string } | null>(null);
  useEffect(() => () => { if (imageDraft) URL.revokeObjectURL(imageDraft.url); }, [imageDraft]);

  async function previewFile(key: MediaKey, file: File | null) {
    if (!file) return;
    const slot = mediaSlots.find((item) => item.key === key)!;
    const issue = validateLaunchMediaFile(key, file) || (file.type !== "video/mp4" ? await validateImageUpload(file, slot.spec) : null);
    if (issue) { setError(issue); return; }
    setError(""); setVideoJob(null); setPoster(null); setImageDraft(null);
    if (file.type === "video/mp4") setVideoFile(file);
    else { setVideoFile(null); setImageDraft({ key, file, url: URL.createObjectURL(file) }); }
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

  async function change(key: MediaKey, file: File | null, remove = false) {
    if (!remove && !file) return;
    const slot = mediaSlots.find((item) => item.key === key)!;
    const fileError = file ? validateLaunchMediaFile(key, file) : null;
    if (fileError) {
      setError(fileError);
      return;
    }
    if (file?.type === "video/mp4") { setVideoJob(null); setVideoFile(file); return; }
    setVideoFile(null); setVideoJob(null);
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
      if (key === "market_login" || key === "delivery_login") form.set(`${key}_focus`, JSON.stringify(media?.[`${key}_focus`] ?? { x: 0.5, y: 0 }));
      const response = await apiFetch("dashboard/app-media/", remove
        ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: null }) }
        : { method: "PATCH", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(launchMediaError(data, field));
      setMedia(data as Media);
      setImageDraft(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الملف.");
    } finally {
      setBusy(null);
    }
  }

  async function publishVideo() {
    if (!videoJob || videoJob.state !== "ready") return;
    setBusy("market_login"); setError("");
    try {
      const body = new FormData(); body.set("video_job_id", videoJob.id);
      body.set("market_login_focus", JSON.stringify(media?.market_login_focus ?? { x: 0.5, y: 0 }));
      if (poster) body.set("market_login_poster", poster);
      const response = await apiFetch("dashboard/app-media/", { method: "PATCH", body });
      const data = await response.json();
      if (!response.ok) throw new Error(launchMediaError(data, "video_job_id"));
      setMedia(data as Media); setVideoFile(null); setVideoJob(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر نشر الفيديو."); }
    finally { setBusy(null); }
  }

  async function saveFocus(key: "market_login" | "delivery_login", focus: FocalPoint) {
    setBusy(key);
    try {
      const response = await apiFetch("dashboard/app-media/", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [`${key}_focus`]: focus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(launchMediaError(data, `${key}_focus`));
      setMedia(data as Media);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ موضع القص."); }
    finally { setBusy(null); }
  }

  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">صور وفيديوهات بداية التطبيقات</h3>
      <MediaProcessingStatus />
      <p className="mt-1 text-sm text-muted-foreground">تظهر التغييرات عند فتح شاشة الـ Onboarding أو اللوجن من جديد.</p>
      <div className="mt-5 grid gap-4">
        {mediaSlots.map((slot) => {
          const url = imageDraft?.key === slot.key ? imageDraft.url : media?.[`${slot.key}_url`];
          const isVideo = slot.key === "market_login" && !!url && /\.mp4(?:\?|$)/i.test(url);
          const focus = slot.key === "market_login" || slot.key === "delivery_login" ? media?.[`${slot.key}_focus`] ?? { x: 0.5, y: 0 } : { x: 0.5, y: 0.5 };
          const objectPosition = `${focus.x * 100}% ${focus.y * 100}%`;
          const previewHeight = slot.key === "market_login" ? 240 : slot.key === "delivery_login" ? 250 : 384;
          return <div key={slot.key} className="rounded-lg border p-3">
            {slot.key === "market_login" && videoFile ? <><VideoPreparation file={videoFile} slot="market_login" onReady={setVideoJob} onCancel={() => setVideoFile(null)} /><label className="block text-sm">صورة معاينة بديلة (اختياري)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void validateImageUpload(file, slot.spec).then((issue) => { if (issue) setError(issue); else setPoster(file); }); }} /></label><Button disabled={busy !== null || videoJob?.state !== "ready"} onClick={() => void publishVideo()}>نشر الفيديو الجاهز</Button></> : null}
            {(slot.key === "market_login" || slot.key === "delivery_login") && url ? <FocalPreview source={isVideo ? media?.market_login_poster_url ?? "" : url} focus={media?.[`${slot.key}_focus`] ?? { x: 0.5, y: 0 }} kind={slot.key === "market_login" ? "market-login" : "delivery-login"} onChange={(focus) => setMedia((current) => current ? { ...current, [`${slot.key}_focus`]: focus } : current)} /> : null}
            {(slot.key === "market_login" || slot.key === "delivery_login") && url ? <Button disabled={busy !== null} onClick={() => void saveFocus(slot.key as "market_login" | "delivery_login", (slot.key === "market_login" ? media?.market_login_focus : media?.delivery_login_focus) ?? { x: 0.5, y: 0 })}>حفظ موضع القص</Button> : null}
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
              {imageDraft?.key === slot.key ? <><Button disabled={busy !== null} onClick={() => void change(slot.key, imageDraft.file)}>نشر الصورة بعد المعاينة</Button><Button variant="outline" disabled={busy !== null} onClick={() => setImageDraft(null)}>إلغاء التغيير</Button></> : null}
              {url ? <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void change(slot.key, null, true)}>استخدام الافتراضي</Button> : null}
              <span className="text-xs text-muted-foreground">{slot.key === "market_login" ? "MP4 حتى 30 MB أو صورة حتى 5 MB" : "JPG / PNG / WEBP حتى 5 MB"}</span>
            </div>
          </div>;
        })}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
    </Card>
  );
}
