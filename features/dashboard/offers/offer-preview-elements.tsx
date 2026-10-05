"use client";

import { useEffect, useState } from "react";
import { Box, Globe, ReceiptText, Truck, Zap } from "lucide-react";
import type { OfferFormState } from "./form-types";

export function offerPreviewMeta(state: OfferFormState) {
  const type = state.selectedType;
  const external = type === "إعلان" && Boolean(state.announcementUrl.trim());
  const percent = Number(type === "فلاش" ? state.flashDiscountPercent
    : type === "باكج" ? state.packageDiscountPercent
    : type === "خصم" ? state.discountPercent : 0);
  const label = type === "فلاش" ? "عرض سريع" : type;
  return {
    badge: !external && Number.isFinite(percent) && percent > 0 ? `${label} - خصم ${percent}%` : label,
    color: type === "فلاش" ? "#F59E0B" : type === "خصم" ? "#EF4444" : "#013C7E",
    Icon: type === "فلاش" ? Zap : type === "خصم" ? ReceiptText : type === "توصيل" ? Truck : type === "إعلان" ? Globe : Box,
    cta: external ? state.announcementCtaLabel.trim() || "فتح الإعلان" : "اشتري الآن",
  };
}

export function countdownUnits(endsAt: number, now: number) {
  const seconds = Math.max(0, Math.floor((endsAt - now) / 1000));
  return [Math.floor(seconds / 86400), Math.floor(seconds % 86400 / 3600),
    Math.floor(seconds % 3600 / 60), seconds % 60];
}

export function OfferPreviewCountdown({ endsAt, color }: { endsAt: number; color: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const units = countdownUnits(endsAt, now);
  return <div data-testid="offer-countdown" dir="ltr" className="flex max-w-[108px] gap-[3px] rounded-lg border bg-white/95 px-[3px] py-[2px]"
    style={{ borderColor: `${color}3D` }} aria-label="الوقت المتبقي للعرض">
    {units.map((value, index) => <div key={index} className="flex w-[22px] flex-col items-center rounded-lg border px-[3px] py-[3px]"
      style={{ color, backgroundColor: `${color}1F`, borderColor: `${color}3D` }}>
      <span className="text-[12px] font-black leading-none text-[#1A1A1A] tabular-nums">{index === 0 ? value : String(value).padStart(2, "0")}</span>
      <span className="mt-[2px] text-[8px] font-black leading-none">{["يوم", "ساعة", "دقيقة", "ثانية"][index]}</span>
    </div>)}
  </div>;
}
