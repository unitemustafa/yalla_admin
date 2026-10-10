"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/features/dashboard/primitives";
import { SafeImage } from "@/components/safe-image";
import { mediaSpecs } from "@/lib/media-specs";
import type { FocalPoint } from "../focal-preview";
import { OfferPreviewCountdown, offerPreviewMeta } from "./offer-preview-elements";
import type { OfferFormState } from "./form-types";

interface OfferPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  state: OfferFormState;
  initialFocus: FocalPoint;
  onApply: (focus: FocalPoint) => void;
}

export function OfferPreviewDialog(props: OfferPreviewDialogProps) {
  if (!props.isOpen) return null;
  return <OfferPreviewContent key={props.imageUrl} {...props} />;
}

function OfferPreviewContent({
  onClose,
  imageUrl,
  state,
  onApply,
  initialFocus,
}: OfferPreviewDialogProps) {
  const [focus, setFocus] = useState<FocalPoint>(initialFocus);
  const [previewWidth, setPreviewWidth] = useState<number>(390);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [showSafeZone, setShowSafeZone] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(440);

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

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    const preview = previewRef.current;
    if (preview) observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  const { badge: badgeText, color: badgeColor, cta: ctaLabel, Icon: BadgeIcon } = offerPreviewMeta(state);
  const endsAt = new Date(`${state.endDate}T${state.endTime}`).getTime();
  const spec = mediaSpecs.offerBanner;
  const safeInsetX = (1 - (spec.safeWidth ?? spec.width) / spec.width) * 50;
  const safeInsetY = (1 - (spec.safeHeight ?? spec.height) / spec.height) * 50;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = (e.clientY - rect.top) / rect.height;
    const clampedX = Math.round(Math.max(0, Math.min(1, rawX)) * 100) / 100;
    const clampedY = Math.round(Math.max(0, Math.min(1, rawY)) * 100) / 100;
    setFocus({ x: clampedX, y: clampedY });
  };

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-preview-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto w-[calc(100%_-_24px)] max-w-5xl max-h-[92vh] border-0 bg-transparent p-0 text-foreground backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="relative w-full bg-card text-card-foreground rounded-2xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/40">
          <div>
            <h2 id="offer-preview-title" className="text-lg font-bold">
              معاينة وضبط بانر العرض الترويجي
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              المقاس القياسي: {spec.width}×{spec.height}px — معاينة تطابق شاشات تطبيق يلا ماركت
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Left Column: Phone & Card Mockup (7 cols) */}
          <div className="lg:col-span-7 min-w-0 flex flex-col items-center">
            {/* Viewport & Theme controls */}
            <div className="flex flex-wrap items-center justify-between w-full max-w-[430px] mb-3 gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-xs">
                <span className="px-2 text-muted-foreground font-medium">الشاشة:</span>
                {[320, 360, 390, 430].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPreviewWidth(w)}
                    className={`px-2 py-1 rounded-md font-medium transition ${
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

            {/* Realistic Mobile Viewport Shell */}
            <div ref={previewRef} className="w-full overflow-x-auto py-2">
            <div
              data-testid="offer-phone"
              className={`relative mx-auto rounded-[32px] border-[5px] shadow-2xl p-4 overflow-hidden transition-all duration-300 select-none flex flex-col justify-center items-center ${
                previewTheme === "dark"
                  ? "bg-[#111827] border-slate-700 text-white"
                  : "bg-[#F8FAFC] border-slate-300 text-slate-900"
              }`}
              style={{ width: `${previewWidth + 10}px`, minHeight: "360px", flexShrink: 0,
                zoom: Math.min(1, availableWidth / (previewWidth + 10)) }}
            >
              {/* App Top Bar hint */}
              <div className="w-full flex items-center justify-between px-2 mb-3 text-xs opacity-70">
                <span className="font-bold">العروض المميزة ⭐</span>
                <span className="text-[10px]">يلا ماركت</span>
              </div>

                {/* Flutter banner proportions and overlay positions */}
              <div
                ref={cardRef}
                data-testid="offer-banner"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative w-full rounded-lg overflow-hidden shadow-md cursor-crosshair group touch-none"
                style={{
                  aspectRatio: `${spec.width} / ${spec.height}`,
                  borderColor:
                    previewTheme === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                  boxShadow: previewTheme === "light" ? "0 4px 8px rgba(0,0,0,0.045)" : undefined,
                }}
              >
                {/* Background Image */}
                <SafeImage
                  src={imageUrl}
                  unoptimized
                  fill
                  sizes={`${previewWidth}px`}
                  alt="معاينة بانر العرض"
                  className="absolute inset-0 size-full object-cover pointer-events-none transition-all duration-75"
                  style={{
                    objectPosition: `${focus.x * 100}% ${focus.y * 100}%`,
                  }}
                />

                {/* Left & Right Gradient Scrim (matching Flutter promo_offer_image_scrim) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to left, rgba(0,0,0,0.30) 0%, transparent 48%, rgba(0,0,0,0.44) 100%)",
                  }}
                />

                {/* Safe Zone Overlay */}
                {showSafeZone ? (
                  <div data-testid="offer-safe-zone" style={{ inset: `${safeInsetY}% ${safeInsetX}%` }} className="absolute border-2 border-dashed border-amber-400/80 rounded-lg pointer-events-none flex items-center justify-center">
                    <span className="bg-black/70 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
                      المنطقة الآمنة للنصوص (Safe Zone)
                    </span>
                  </div>
                ) : null}

                {/* Left Overlay: Badge & Buy Button (matching Flutter _OfferOverlayBadge & _OfferBuyButton) */}
                <div className="absolute inset-y-2 left-2.5 flex flex-col items-start justify-between pointer-events-none z-10">
                  {/* Badge */}
                  <div data-testid="offer-badge" className="inline-flex max-w-[142px] items-center gap-[3px] px-[6px] py-[3px] rounded-lg text-white text-[8px] font-black shadow-md" style={{ backgroundColor: `${badgeColor}EB` }}>
                    <BadgeIcon className="size-[10px] shrink-0" />
                    <span className="truncate">{badgeText}</span>
                  </div>

                  {/* Buy Button */}
                  <div data-testid="offer-cta" className="w-28 h-7 rounded-[7px] bg-[#013C7E] text-white flex items-center justify-center text-[11px] leading-none font-black overflow-hidden whitespace-nowrap">
                    {ctaLabel}
                  </div>
                </div>

                {/* Right Bottom: Countdown Chip */}
                {Number.isFinite(endsAt) ? <div className="absolute bottom-2 right-2.5 pointer-events-none z-10">
                  <OfferPreviewCountdown endsAt={endsAt} color={badgeColor} />
                </div> : null}

                {/* Focus Target Pin */}
                <div
                  className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
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
              </div>

              {/* Instruction note below card */}
              <p className="text-[11px] text-muted-foreground mt-3 text-center">
                💡 انقر أو اسحب لتعديل موضع الصورة. المنطقة الآمنة إرشادية؛ تأكد أن النص لا يتداخل مع الشارة والزر والعداد.
              </p>
            </div>
            </div>
          </div>

          {/* Right Column: Controls & Guidance (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Safe Zone Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold">إظهار المنطقة الآمنة (Safe Zone)</span>
                  <p className="text-[10px] text-muted-foreground">
                    مساحة إرشادية {spec.safeWidth ?? spec.width}×{spec.safeHeight ?? spec.height}px؛ راجع تداخل النص مع عناصر التطبيق
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSafeZone((prev) => !prev)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                    showSafeZone
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {showSafeZone ? "مفعلة ✅" : "معطلة ❌"}
                </button>
              </div>

              {/* Alignment Controls */}
              <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>🎯</span>
                  <span>محاذاة وموضع البانر</span>
                </h3>

                {/* X Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">المحور الأفقي (X):</span>
                    <span className="font-mono font-bold text-primary">
                      {Math.round(focus.x * 100)}% ({focus.x <= 0.3 ? "يسار" : focus.x >= 0.7 ? "يمين" : "وسط"})
                    </span>
                  </div>
                  <input
                    aria-label="محاذاة أفقية"
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
                      0% (يسار)
                    </button>
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, x: 0.5 }))} className="hover:underline">
                      50% (وسط)
                    </button>
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, x: 1 }))} className="hover:underline">
                      100% (يمين)
                    </button>
                  </div>
                </div>

                {/* Y Slider */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">المحور الرأسي (Y):</span>
                    <span className="font-mono font-bold text-primary">
                      {Math.round(focus.y * 100)}% ({focus.y <= 0.3 ? "أعلى" : focus.y >= 0.7 ? "أسفل" : "وسط"})
                    </span>
                  </div>
                  <input
                    aria-label="محاذاة رأسية"
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
                      0% (أعلى)
                    </button>
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, y: 0.5 }))} className="hover:underline">
                      50% (وسط)
                    </button>
                    <button type="button" onClick={() => setFocus((prev) => ({ ...prev, y: 1 }))} className="hover:underline">
                      100% (أسفل)
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">أوضاع سريعة:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 0.5, y: 0.5 })}
                  >
                    المنتصف ⭐
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 0.5, y: 0 })}
                  >
                    أعلى الوسط
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
                    onClick={() => setFocus({ x: 0, y: 0.5 })}
                  >
                    يسار الوسط
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 1, y: 0.5 })}
                  >
                    يمين الوسط
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-1.5 h-auto"
                    onClick={() => setFocus({ x: 1, y: 0 })}
                  >
                    أعلى اليمين
                  </Button>
                </div>
              </div>

              {/* Banner Elements Overview */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs space-y-1.5 text-sky-900 dark:text-sky-200">
                <div className="font-bold flex items-center gap-1.5">
                  <span>ℹ️</span>
                  <span>عناصر واجهة البانر المطبقة في التطبيق:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] opacity-90 leading-relaxed">
                  <li><strong>شارة العرض:</strong> {badgeText} (الركن العلوي الأيسر).</li>
                  <li><strong>زر الإجراء:</strong> {ctaLabel} (الركن السفلي الأيسر).</li>
                  <li><strong>الظلال الجانبية:</strong> تدرج مظلم تلقائي على الأطراف لحماية قراءة النصوص.</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                إغلاق
              </Button>
              <Button
                type="button"
                onClick={() => {
                   onApply(focus);
                  onClose();
                }}
                className="min-w-28 font-bold"
              >
                اعتماد المظهر
              </Button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
