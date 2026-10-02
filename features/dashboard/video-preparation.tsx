"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { launchMediaError } from "./app-media/domain";

export type MediaJob = { id: string; state: "pending" | "processing" | "ready" | "failed"; error: string; retryable: boolean; poster_url: string | null; video_url: string | null; created_at: string };

export function VideoPreparation({ file, slot, onReady, onCancel }: { file: File; slot: "campaign" | "market_login"; onReady: (job: MediaJob | null) => void; onCancel: () => void }) {
  const { apiFetch } = useAuth();
  const [job, setJob] = useState<MediaJob | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [stalled, setStalled] = useState(false);
  const pollRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    let active = true;
    let current: MediaJob | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const read = async (response: Response) => {
      const data = await response.json() as MediaJob;
      if (!response.ok) throw new Error(launchMediaError(data, "file"));
      return data;
    };
    const poll = async () => {
      try {
        current = await read(await apiFetch(`dashboard/media-jobs/${current!.id}/`, { signal: controller.signal }));
        if (!active) return;
        setJob(current);
        setError("");
        setStalled(Date.now() - Date.parse(current.created_at) > 600000);
        if (current.state === "ready") { onReady(current); return; }
        if (current.state === "failed") { setError(current.error); return; }
        timer = setTimeout(() => void poll(), 2000);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "تعذر متابعة تجهيز الفيديو.");
        timer = setTimeout(() => void poll(), 5000);
      }
    };
    pollRef.current = poll;
    onReady(null);
    const body = new FormData(); body.set("slot", slot); body.set("file", file);
    void apiFetch("dashboard/media-jobs/", { method: "POST", body }).then(read).then((data) => {
      current = data;
      if (!active) { void apiFetch(`dashboard/media-jobs/${data.id}/`, { method: "DELETE" }).catch(() => undefined); return; }
      setJob(data); setError(""); void poll();
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "تعذر رفع الفيديو."); });
    return () => {
      active = false; controller.abort(); clearTimeout(timer);
      pollRef.current = null;
      if (current && current.state !== "ready") void apiFetch(`dashboard/media-jobs/${current.id}/`, { method: "DELETE" }).catch(() => undefined);
    };
  }, [apiFetch, file, slot, onReady, attempt]);

  async function cancel() {
    if (!job) return;
    try {
      const response = await apiFetch(`dashboard/media-jobs/${job.id}/`, { method: "DELETE" });
      if (response.ok) { onReady(null); onCancel(); }
      else setError("تعذر إلغاء التجهيز. أعد المحاولة.");
    } catch { setError("تعذر إلغاء التجهيز. تحقق من الاتصال وأعد المحاولة."); }
  }
  async function retry() {
    if (!job) { setAttempt((n) => n + 1); return; }
    try {
      const response = await apiFetch(`dashboard/media-jobs/${job.id}/retry/`, { method: "POST" });
      if (!response.ok) { setError("تعذر إعادة التجهيز. اختر ملفًا جديدًا."); return; }
      setError(""); setJob(await response.json() as MediaJob); void pollRef.current?.();
    } catch { setError("تعذر إعادة التجهيز. تحقق من الاتصال وأعد المحاولة."); }
  }
  const waiting = job && ["pending", "processing"].includes(job.state);
  return <div className="rounded border p-3 text-sm" aria-live="polite">
    <p>{job?.state === "ready" ? "الفيديو جاهز للمعاينة والنشر." : job?.state === "failed" ? "فشل تجهيز الفيديو؛ الملف المنشور لم يتغير." : "جاري رفع وفحص وتجهيز الفيديو؛ الملف المنشور يظل متاحًا."}</p>
    {job?.state === "ready" && job.video_url ? <video controls preload="metadata" src={job.video_url} poster={job.poster_url ?? undefined} className="mt-2 max-h-60 w-full" /> : null}
    {waiting && stalled ? <p role="alert">التجهيز تأخر أكثر من 10 دقائق. راجع حالة العامل.</p> : null}
    {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    {job && job.state !== "ready" ? <button type="button" className="m-2 underline" onClick={() => void cancel()}>إلغاء التجهيز</button> : null}
    {job?.retryable || (!job && error) ? <button type="button" className="m-2 underline" onClick={() => void retry()}>إعادة تجهيز الملف</button> : null}
  </div>;
}
