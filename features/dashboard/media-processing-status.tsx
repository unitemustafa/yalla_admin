"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";

type Stats = { counts: Record<"pending" | "processing" | "ready" | "failed", number>; stalled: number };
export function MediaProcessingStatus() {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    const poll = async () => {
      try {
        const response = await apiFetch("dashboard/media-jobs/stats/", { signal: abort.signal });
        if (!response.ok) throw new Error("Media status unavailable");
        const data = await response.json() as Stats;
        if (active) { setStats(data); setError(false); }
      } catch { if (active) setError(true); }
      finally { if (active) timer = setTimeout(() => void poll(), 60000); }
    };
    void poll();
    return () => { active = false; abort.abort(); clearTimeout(timer); };
  }, [apiFetch]);
  return <div className="my-3 rounded border p-3 text-xs" aria-live="polite">
    {stats ? <p>طابور الميديا: انتظار {stats.counts.pending}، تجهيز {stats.counts.processing}، جاهز {stats.counts.ready}، فشل {stats.counts.failed}.</p> : null}
    {stats?.stalled ? <p role="alert" className="text-destructive">تنبيه: {stats.stalled} عملية تجاوزت 10 دقائق. راجع عامل الميديا ثم أعد المحاولة للعمليات الفاشلة.</p> : null}
    {error ? <p role="alert">تعذر تحميل حالة طابور الميديا.</p> : null}
  </div>;
}
