"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { applyMediaContract } from "@/lib/media-specs";

export function MediaSpecsProvider({ children }: { children: React.ReactNode }) {
  const { apiFetch, status } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    const abort = new AbortController();
    void apiFetch("dashboard/media-specs/", { signal: abort.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Media specifications unavailable");
      const data: unknown = await response.json();
      if (active) { applyMediaContract(data); setReady(true); setError(false); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; abort.abort(); };
  }, [apiFetch, status, attempt]);
  if (ready) return children;
  return <div className="p-8" role="status">{error
    ? <>تعذر تحميل مواصفات الميديا من السيرفر. <button className="underline" onClick={() => setAttempt((n) => n + 1)}>إعادة المحاولة</button></>
    : "جاري تحميل مواصفات الميديا..."}</div>;
}
