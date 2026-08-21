"use client";

import { useEffect } from "react";

import { DashboardImage } from "../dashboard-image";
import { Button, Card, CurrencyText } from "../primitives";
import { cn } from "@/lib/utils";
import {
  offerTypeOptions,
  type OfferCard,
} from "./domain";

export function RefBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "yellow" | "blue" | "red" | "purple" | "orange" | "gray";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        tone === "green" &&
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
        tone === "yellow" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
        tone === "blue" &&
          "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
        tone === "red" &&
          "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200",
        tone === "purple" && "bg-purple-100 text-purple-700",
        tone === "orange" &&
          "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200",
        tone === "gray" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function MetricCards({
  cards,
}: {
  cards: Array<[string, string, React.ComponentType<{ className?: string }>, string]>;
}) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon, tone]) => (
        <Card key={label} className="h-[75px] rounded-[12px]">
          <div className="flex h-full items-center gap-3 px-6">
            <div className={cn("rounded-full bg-muted/50 p-3", tone)}>
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <CurrencyText className="block text-xl font-semibold leading-tight">{value}</CurrencyText>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function MiniIconButton({
  children,
  tone = "default",
  ariaLabel,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "orange" | "red";
  ariaLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-35",
        tone === "green" && "text-green-600",
        tone === "orange" && "text-orange-500",
        tone === "red" && "text-red-500",
        tone === "default" && "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function getCountdownParts(endsAt: string, now: number | null) {
  if (now === null) {
    return { days: "--", hours: "--", minutes: "--", seconds: "--", expired: false };
  }

  const endTime = new Date(endsAt).getTime();

  if (!Number.isFinite(endTime)) {
    return { days: "--", hours: "--", minutes: "--", seconds: "--", expired: false };
  }

  const diffMs = endTime - now;
  const expired = diffMs <= 0;
  const totalSeconds = Math.max(0, Math.ceil(Math.abs(diffMs) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    expired,
  };
}

function CountdownValue({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-background/80 px-2 py-2 text-center shadow-sm">
      <div className="text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[11px] leading-none text-muted-foreground">{label}</div>
    </div>
  );
}

export function OfferCountdown({ endsAt, now }: { endsAt: string; now: number | null }) {
  const countdown = getCountdownParts(endsAt, now);

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-3",
        countdown.expired
          ? "border-red-500/20 bg-red-500/10"
          : "border-primary/20 bg-primary/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {countdown.expired ? "انتهى منذ" : "متبقي"}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[11px] font-semibold leading-none",
            countdown.expired
              ? "bg-red-500/15 text-red-200"
              : "bg-primary/15 text-primary",
          )}
        >
          {countdown.expired ? "منتهي" : "ينتهي خلال"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <CountdownValue value={countdown.days} label="أيام" />
        <CountdownValue value={countdown.hours} label="ساعات" />
        <CountdownValue value={countdown.minutes} label="دقائق" />
        <CountdownValue value={countdown.seconds} label="ثواني" />
      </div>
    </div>
  );
}

type OfferVisualData = Pick<OfferCard, "title" | "description" | "type" | "endsAt"> & {
  image?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
  iconBg?: string;
};

function offerVisualMeta(type: string) {
  return offerTypeOptions.find((option) => option.label === type) ?? offerTypeOptions[2];
}

function inlineCountdownText(countdown: ReturnType<typeof getCountdownParts>) {
  if (countdown.expired) return "انتهى";
  if (countdown.days !== "0" && countdown.days !== "--") {
    return `${countdown.days}ي ${countdown.hours}:${countdown.minutes}:${countdown.seconds}`;
  }
  return `${countdown.hours}:${countdown.minutes}:${countdown.seconds}`;
}

export function OfferVisual({
  offer,
  now,
  className,
}: {
  offer: OfferVisualData;
  now: number | null;
  className?: string;
}) {
  const meta = offerVisualMeta(offer.type);
  const Icon = offer.icon ?? meta.icon;
  const accent = offer.accent ?? meta.accent;
  const iconBg = offer.iconBg ?? meta.bg;
  const countdown = offer.type === "فلاش" ? getCountdownParts(offer.endsAt, now) : null;

  return (
    <div className={cn("relative isolate overflow-hidden rounded-md border bg-muted", className)}>
      {offer.image ? (
        <DashboardImage
          src={offer.image}
          placeholderType="offer"
          alt=""
          width={800}
          height={300}
          sizes="(min-width: 1280px) 360px, 100vw"
          className="absolute inset-0 size-full"
          imageClassName="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}
      <div className="absolute inset-0 z-20 bg-gradient-to-l from-black/75 via-black/35 to-black/20" />
      <div className="relative z-30 flex h-full min-h-[136px] flex-col justify-between p-3 text-white">
        <div className="flex items-start justify-between gap-3">
          {countdown ? (
            <div
              className={cn(
                "rounded-md border px-2.5 py-2 text-center shadow-sm backdrop-blur",
                countdown.expired
                  ? "border-red-300/30 bg-red-500/25"
                  : "border-white/25 bg-black/35",
              )}
            >
              <div className="text-[11px] font-medium leading-none text-white/75">
                {countdown.expired ? "الحالة" : "متبقي"}
              </div>
              <div className="mt-1 font-mono text-sm font-semibold leading-none">
                {inlineCountdownText(countdown)}
              </div>
            </div>
          ) : (
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md bg-white/90", accent)}>
              <Icon className="size-5" />
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold", iconBg, accent)}>
            <Icon className="size-3.5" />
            {offer.type}
          </span>
        </div>

        <div className="max-w-[76%]">
          <h3 className="truncate text-base font-semibold leading-6">{offer.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/75">
            {offer.description || "بدون وصف"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function OfferInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-end font-semibold">{value}</span>
    </div>
  );
}

export function OfferDeleteModal({
  offer,
  deleting,
  onClose,
  onConfirm,
}: {
  offer: OfferCard;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-offer-title"
        className="w-full max-w-md overflow-hidden rounded-lg border bg-background shadow-2xl"
      >
        <div className="border-b px-5 py-4">
          <h2 id="delete-offer-title" className="text-base font-bold">
            {offer.deletionMode === "archive" ? "أرشفة العرض" : "حذف العرض نهائيًا"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{offer.title}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {offer.deletionMode === "archive"
              ? "العرض مرتبط بسجلات سابقة، لذلك سيتم إخفاؤه وأرشفته وتعطيله مع إمكانية استعادته."
              : "سيتم حذف العرض نهائيًا ولا يمكن التراجع بعد تنفيذ الحذف."}
          </p>
        </div>
        <div className="flex justify-end gap-2 p-5">
          <Button type="button" variant="outline" disabled={deleting} onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" variant="danger" disabled={deleting} onClick={onConfirm}>
            {deleting ? "جار التنفيذ..." : offer.deletionMode === "archive" ? "أرشفة" : "حذف نهائي"}
          </Button>
        </div>
      </div>
    </div>
  );
}
