"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/features/dashboard/primitives";
import { SafeImage } from "@/components/safe-image";
import type { FocalPoint } from "../focal-preview";
import type { MediaKey } from "./domain";

interface LoginPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (focus: FocalPoint) => Promise<void>;
  mediaKey: MediaKey;
  mediaUrl: string;
  isVideo: boolean;
  initialFocus: FocalPoint;
  isSaving: boolean;
  error?: string;
}

export function LoginPreviewDialog(props: LoginPreviewDialogProps) {
  if (!props.isOpen) return null;
  return <LoginPreviewContent key={`${props.mediaKey}:${props.mediaUrl}`} {...props} />;
}

function LoginPreviewContent({
  onClose,
  onSave,
  mediaKey,
  mediaUrl,
  isVideo,
  initialFocus,
  isSaving,
  error,
}: LoginPreviewDialogProps) {
  const [focus, setFocus] = useState<FocalPoint>(initialFocus);
  const [previewWidth, setPreviewWidth] = useState<number>(360);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [isDragging, setIsDragging] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  const bannerHeight = mediaKey === "market_login" ? 240 : 250;
  const isMarket = mediaKey === "market_login";
  const appTitle = isMarket ? "يلا ماركت (Yalla Market)" : "يلا دليفيري (Yalla Delivery)";

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSaving) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFocusFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFocusFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const updateFocusFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!bannerRef.current) return;
    const rect = bannerRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const rawX = (clientX - rect.left) / rect.width;
    const rawY = (clientY - rect.top) / rect.height;
    const clampedX = Math.round(Math.max(0, Math.min(1, rawX)) * 100) / 100;
    const clampedY = Math.round(Math.max(0, Math.min(1, rawY)) * 100) / 100;
    setFocus({ x: clampedX, y: clampedY });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="login-preview-title"
      onCancel={(event) => { event.preventDefault(); if (!isSaving) onClose(); }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 flex items-center justify-center p-3 sm:p-6 bg-transparent backdrop:bg-black/75 backdrop:backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-card text-card-foreground rounded-2xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/40">
          <div>
            <h2 id="login-preview-title" className="text-lg font-bold">
              معاينة وضبط شاشة تسجيل الدخول
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {appTitle} — ارتفاع البانر {bannerHeight}px
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Left Column: Phone Mockup (7 cols) */}
          <div className="lg:col-span-7 min-w-0 flex flex-col items-center">
            {/* Viewport & Theme controls */}
            <div className="flex flex-wrap items-center justify-between w-full max-w-[430px] mb-3 gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-xs">
                <span className="px-2 text-muted-foreground font-medium">عرض الشاشة:</span>
                {[360, 390, 430].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPreviewWidth(w)}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      previewWidth === w
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTheme("light")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    previewTheme === "light"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  نهار ☀️
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme("dark")}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    previewTheme === "dark"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ليل 🌙
                </button>
              </div>
            </div>

            {/* Realistic Phone Mockup */}
            <div className="w-full overflow-x-auto pb-2">
            <div
              className={`relative mx-auto rounded-[36px] border-[5px] shadow-2xl overflow-hidden transition-all duration-300 select-none ${
                previewTheme === "dark"
                  ? "bg-[#1A1B20] border-slate-700 text-white"
                  : "bg-white border-slate-300 text-slate-900"
              }`}
              style={{ boxSizing: "content-box", width: `${previewWidth}px`, height: "560px" }}
            >
              {/* Phone Status Bar */}
              <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 pt-2 pb-1 text-[11px] font-semibold opacity-85">
                <span>9:41</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>📶</span>
                  <span>⚡</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Banner Area (Interactive Focal Drag) */}
              <div
                ref={bannerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative w-full overflow-hidden cursor-crosshair touch-none select-none group"
                style={{ height: `${bannerHeight}px` }}
                title="انقر أو اسحب لتحديد نقطة التركيز"
              >
                {/* Media Element */}
                {isVideo ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 size-full object-cover pointer-events-none"
                    style={{
                      objectPosition: `${focus.x * 100}% ${focus.y * 100}%`,
                    }}
                  />
                ) : (
                  <SafeImage
                    src={mediaUrl}
                    unoptimized
                    fill
                    sizes={`${previewWidth}px`}
                    alt="معاينة شاشة تسجيل الدخول"
                    className="absolute inset-0 size-full object-cover pointer-events-none"
                    style={{
                      objectPosition: `${focus.x * 100}% ${focus.y * 100}%`,
                    }}
                  />
                )}

                {/* Soft ambient overlay matching Flutter app */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      previewTheme === "dark"
                        ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 45%, rgba(0,0,0,0.40) 100%)"
                        : "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 45%, rgba(0,0,0,0.08) 100%)",
                  }}
                />

                {/* Focus Target Reticle / Pin */}
                <div
                  className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                  style={{
                    left: `${focus.x * 100}%`,
                    top: `${focus.y * 100}%`,
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="size-6 rounded-full border-2 border-white bg-primary/80 shadow-lg animate-pulse" />
                    <div className="absolute size-1.5 rounded-full bg-white" />
                  </div>
                </div>

                {/* Hover overlay hint */}
                <div className="absolute top-8 left-3 z-20 pointer-events-none rounded bg-black/60 px-2 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  انقر أو اسحب لتحديد التركيز
                </div>
              </div>

              {/* Bottom Sheet Overlap (-22px) */}
              <div
                className={`relative -mt-[22px] rounded-t-[24px] px-5 pt-10 pb-6 transition-colors duration-200 z-10 shadow-lg ${
                  previewTheme === "dark" ? "bg-[#1A1B20]" : "bg-white"
                }`}
                style={{ minHeight: "330px" }}
              >
                {/* Floating Centered Logo Badge */}
                <div className="absolute -top-[37px] left-1/2 transform -translate-x-1/2 z-20">
                  <div
                    className={`size-[74px] rounded-[20px] p-1.5 border-[3.5px] shadow-lg flex items-center justify-center ${
                      isMarket
                        ? previewTheme === "dark"
                          ? "bg-[#013C7E] border-[#1A1B20]"
                          : "bg-white border-white"
                        : "bg-[#0D3B75] border-[#1A1B20]"
                    }`}
                  >
                    <div className="size-full rounded-[14px] bg-amber-500/15 flex items-center justify-center text-xs font-bold text-center leading-tight">
                      {isMarket ? "🛒 يلا ماركت" : "🛵 دليفيري"}
                    </div>
                  </div>
                </div>

                {/* Mock Form Content */}
                <div className="space-y-3 mt-1 text-center">
                  <h4 className="text-base font-extrabold tracking-tight">
                    {isMarket ? "أهلاً برجوعك،" : "تسجيل الدخول"}
                  </h4>
                  <p className="text-[11px] opacity-60">
                    {isMarket ? "أول أونلاين ماركت في التل الكبير" : "لوحة تسليم وتوزيع الطلبات"}
                  </p>

                  <div className="space-y-2 pt-2">
                    <div
                      className={`h-9 rounded-xl border px-3 flex items-center text-xs opacity-50 ${
                        previewTheme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"
                      }`}
                    >
                      موبايل / إيميل / اسم مستخدم
                    </div>
                    <div
                      className={`h-9 rounded-xl border px-3 flex items-center justify-between text-xs opacity-50 ${
                        previewTheme === "dark" ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"
                      }`}
                    >
                      <span>كلمة السر</span>
                      <span>👁️</span>
                    </div>
                  </div>

                  <div
                    className={`h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm mt-3 ${
                      isMarket ? "bg-[#013C7E]" : "bg-emerald-600"
                    }`}
                  >
                    تسجيل الدخول
                  </div>
                </div>
              </div>
            </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              💡 يمكنك النقر أو السحب مباشرةً بالماوس داخل صورة البانر لتحديد زاوية الرؤية بدقة.
            </p>
          </div>

          {/* Right Column: Controls & Precision Tuning (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>🎯</span>
                  <span>نقطة التركيز البؤري (Focal Point)</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  بما أن البانر أفقي ({bannerHeight}px) ويتم عرضه بنمط التغطية (Cover)، تحدد نقطة التركيز الجزء الذي يظل ظاهراً ولا يتعرض للقص عند اختلاف الشاشات.
                </p>

                {/* X Axis Slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">المحور الأفقي (X):</span>
                    <span className="font-mono font-bold text-primary">
                      {Math.round(focus.x * 100)}% ({focus.x <= 0.3 ? "يسار" : focus.x >= 0.7 ? "يمين" : "وسط"})
                    </span>
                  </div>
                  <input
                    aria-label="نقطة التركيز الأفقية"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={focus.x}
                    onChange={(e) => setFocus((prev) => ({ ...prev, x: Number(e.target.value) }))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, x: 0 }))} className="hover:underline">
                      0% (أقصى اليسار)
                    </button>
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, x: 0.5 }))} className="hover:underline">
                      50% (الوسط)
                    </button>
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, x: 1 }))} className="hover:underline">
                      100% (أقصى اليمين)
                    </button>
                  </div>
                </div>

                {/* Y Axis Slider */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">المحور الرأسي (Y):</span>
                    <span className="font-mono font-bold text-primary">
                      {Math.round(focus.y * 100)}% ({focus.y <= 0.3 ? "أعلى" : focus.y >= 0.7 ? "أسفل" : "وسط"})
                    </span>
                  </div>
                  <input
                    aria-label="نقطة التركيز الرأسية"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={focus.y}
                    onChange={(e) => setFocus((prev) => ({ ...prev, y: Number(e.target.value) }))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, y: 0 }))} className="hover:underline">
                      0% (أعلى الصورة)
                    </button>
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, y: 0.5 }))} className="hover:underline">
                      50% (الوسط)
                    </button>
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, y: 1 }))} className="hover:underline">
                      100% (أسفل الصورة)
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">أوضاع سريعة جاهزة:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 0.5, y: 0 })}
                  >
                    أعلى الوسط ⭐
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 0.5, y: 0.5 })}
                  >
                    المنتصف
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 0.5, y: 1 })}
                  >
                    أسفل الوسط
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 0, y: 0 })}
                  >
                    أعلى اليسار
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 1, y: 0 })}
                  >
                    أعلى اليمين
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 0, y: 0.5 })}
                  >
                    منتصف اليسار
                  </Button>
                </div>
              </div>

              {/* Tips & Guidance Box */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
                <div className="font-bold flex items-center gap-1.5">
                  <span>📌</span>
                  <span>تنبيه المنطقة الآمنة (Safe Area):</span>
                </div>
                <p className="leading-relaxed opacity-90">
                  كارت واجهة الدخول يغطي آخر 22px من البانر، والشعار العائم يغطي وسطه السفلي. احرص على جعل العناصر المهمة أو الوجوه في الثلث العلوي أو الأوسط لضمان عدم حجبها.
                </p>
              </div>
            </div>

            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
                إلغاء
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                onClick={() => void onSave(focus)}
                className="min-w-32 font-bold"
              >
                {isSaving ? "جاري الحفظ..." : "اعتماد وحفظ المظهر"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
