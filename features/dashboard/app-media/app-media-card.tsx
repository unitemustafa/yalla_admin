"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { Button, Card } from "@/features/dashboard/primitives";
import { SafeImage } from "@/components/safe-image";

type MediaKey = "onboarding_one" | "onboarding_two" | "onboarding_three" | "market_login" | "delivery_login";
type Media = Record<`${MediaKey}_url`, string | null>;

const slots: { key: MediaKey; label: string; accept: string; limit: number }[] = [
  { key: "onboarding_one", label: "صورة Onboarding الأولى", accept: "image/jpeg,image/png,image/webp", limit: 5 },
  { key: "onboarding_two", label: "صورة Onboarding الثانية", accept: "image/jpeg,image/png,image/webp", limit: 5 },
  { key: "onboarding_three", label: "صورة Onboarding الثالثة", accept: "image/jpeg,image/png,image/webp", limit: 5 },
  { key: "market_login", label: "صورة أو فيديو لوجن المتجر", accept: "image/jpeg,image/png,image/webp,video/mp4", limit: 30 },
  { key: "delivery_login", label: "صورة لوجن الدليفيري", accept: "image/jpeg,image/png,image/webp", limit: 5 },
];

export function AppMediaCard() {
  const { apiFetch } = useAuth();
  const [media, setMedia] = useState<Media | null>(null);
  const [busy, setBusy] = useState<MediaKey | null>(null);
  const [error, setError] = useState("");

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
    const slot = slots.find((item) => item.key === key)!;
    if (file && (file.size > slot.limit * 1024 * 1024 || !slot.accept.split(",").includes(file.type))) {
      setError(`اختر ملفًا مناسبًا لا يزيد عن ${slot.limit} ميجابايت.`);
      return;
    }
    setBusy(key);
    setError("");
    try {
      const form = new FormData();
      if (file) form.set(key === "market_login" && file.type === "video/mp4" ? "market_login_video" : key, file);
      const response = await apiFetch("dashboard/app-media/", remove
        ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: null }) }
        : { method: "PATCH", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data?.[key] === "string" ? data[key] : "تعذر حفظ الملف.");
      setMedia(data as Media);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الملف.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-lg font-bold">صور وفيديوهات بداية التطبيقات</h3>
      <p className="mt-1 text-sm text-muted-foreground">تظهر التغييرات عند فتح شاشة الـ Onboarding أو اللوجن من جديد.</p>
      <div className="mt-5 grid gap-4">
        {slots.map((slot) => {
          const url = media?.[`${slot.key}_url`];
          const isVideo = slot.key === "market_login" && !!url && /\.mp4(?:\?|$)/i.test(url);
          return <div key={slot.key} className="rounded-lg border p-3">
            <p className="mb-2 text-sm font-semibold">{slot.label}</p>
            {url ? (isVideo
              ? <video controls className="mb-3 h-32 max-w-full rounded" src={url} />
              : <SafeImage alt={slot.label} className="mb-3 h-32 max-w-full rounded object-contain" src={url} width={256} height={128} />
            ) : <p className="mb-3 text-xs text-muted-foreground">الصورة الافتراضية في التطبيق مستخدمة حاليًا.</p>}
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-md border px-3 py-2 text-sm">
                {busy === slot.key ? "جاري الحفظ..." : "اختيار ملف"}
                <input className="sr-only" type="file" accept={slot.accept} disabled={busy !== null} onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void change(slot.key, file);
                }} />
              </label>
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
