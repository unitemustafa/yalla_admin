"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { padDatePart } from "./schedule";

const calendarWeekDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const arabicMonthNames = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDateDisplay(value: string) {
  const date = parseDateInputValue(value);

  if (!date) {
    return "اختر التاريخ";
  }

  return `${padDatePart(date.getMonth() + 1)}/${padDatePart(date.getDate())}/${date.getFullYear()}`;
}

function dateInputValueFromDate(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function isSameCalendarDay(left: Date | null, right: Date) {
  return (
    Boolean(left) &&
    left?.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildCalendarMonthDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function ScheduleDateField({
  value,
  onChange,
  ariaLabel,
  rangeStart,
  rangeEnd,
  open: controlledOpen,
  onOpenChange,
  popoverClassName,
  popoverAlign = "start",
  compactCalendar = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  rangeStart?: string;
  rangeEnd?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  popoverClassName?: string;
  popoverAlign?: "start" | "end";
  compactCalendar?: boolean;
}) {
  const selectedDate = parseDateInputValue(value);
  const rangeStartDate = parseDateInputValue(rangeStart ?? "");
  const rangeEndDate = parseDateInputValue(rangeEnd ?? "");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const days = useMemo(() => buildCalendarMonthDays(viewDate), [viewDate]);
  const range =
    rangeStartDate && rangeEndDate
      ? rangeStartDate <= rangeEndDate
        ? { start: rangeStartDate, end: rangeEndDate }
        : { start: rangeEndDate, end: rangeStartDate }
      : null;

  function setCalendarOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function moveMonth(direction: -1 | 1) {
    setViewDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(currentDate.getMonth() + direction);
      return nextDate;
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (!open && selectedDate) {
            setViewDate(selectedDate);
          }

          setCalendarOpen(!open);
        }}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-4 text-start text-base font-semibold shadow-sm transition hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span dir="ltr">{formatDateDisplay(value)}</span>
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          dir="rtl"
          className={cn(
            "absolute top-full z-40 mt-2 w-[min(24rem,calc(100vw-4rem))] max-w-full rounded-lg border border-border/80 bg-popover p-3 text-popover-foreground shadow-2xl shadow-black/25",
            popoverAlign === "start" ? "start-0" : "end-0",
            popoverClassName,
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="الشهر السابق"
              onClick={() => moveMonth(-1)}
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="text-sm font-bold">
              {viewDate.getFullYear()} {arabicMonthNames[viewDate.getMonth()]}
            </div>
            <button
              type="button"
              aria-label="الشهر التالي"
              onClick={() => moveMonth(1)}
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
            {calendarWeekDays.map((day) => (
              <div key={day} className="h-7 truncate leading-7">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const currentMonth = day.getMonth() === viewDate.getMonth();
              const selected = isSameCalendarDay(selectedDate, day);
              const rangeEndpoint =
                isSameCalendarDay(range?.start ?? null, day) ||
                isSameCalendarDay(range?.end ?? null, day);
              const inRange = range
                ? startOfDay(day) >= startOfDay(range.start) &&
                  startOfDay(day) <= startOfDay(range.end)
                : false;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(dateInputValueFromDate(day));
                    setCalendarOpen(false);
                  }}
                  className={cn(
                    "grid place-items-center rounded-md text-sm font-semibold transition",
                    compactCalendar ? "h-9" : "h-11",
                    currentMonth && !range
                      ? "bg-muted/35 text-primary hover:bg-primary/15 hover:text-primary"
                      : "text-foreground hover:bg-muted/30",
                    currentMonth &&
                      range &&
                      inRange &&
                      !rangeEndpoint &&
                      "bg-muted/35 text-primary hover:bg-primary/15 hover:text-primary",
                    currentMonth && range && !inRange && "text-foreground",
                    !currentMonth && "text-muted-foreground/45 hover:bg-muted/30",
                    (selected || rangeEndpoint) &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatTimeDisplay(value: string) {
  const [rawHours, rawMinutes] = value.split(":").map(Number);

  if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) {
    return "اختر الوقت";
  }

  const period = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  return `${padDatePart(hours)}:${padDatePart(rawMinutes)} ${period}`;
}

const scheduleHourOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const scheduleMinuteOptions = Array.from({ length: 60 }, (_, index) => index);
const schedulePeriodOptions = ["AM", "PM"] as const;

function parseTimeParts(value: string) {
  const [rawHours, rawMinutes] = value.split(":").map(Number);
  const validHours = Number.isFinite(rawHours) && rawHours >= 0 && rawHours <= 23;
  const validMinutes = Number.isFinite(rawMinutes) && rawMinutes >= 0 && rawMinutes <= 59;
  const hours24 = validHours ? rawHours : 12;
  const minutes = validMinutes ? rawMinutes : 0;
  const period: (typeof schedulePeriodOptions)[number] = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return { hours12, minutes, period };
}

function timeValueFromParts(
  hours12: number,
  minutes: number,
  period: (typeof schedulePeriodOptions)[number],
) {
  const normalizedHours = hours12 === 12 ? 0 : hours12;
  const hours24 = period === "PM" ? normalizedHours + 12 : normalizedHours;

  return `${padDatePart(hours24)}:${padDatePart(minutes)}`;
}

export function ScheduleTimeField({
  value,
  onChange,
  ariaLabel,
  open: controlledOpen,
  onOpenChange,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const { hours12, minutes, period } = parseTimeParts(value);

  function setTimeOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function updateTime(
    nextParts: Partial<{
      hours12: number;
      minutes: number;
      period: (typeof schedulePeriodOptions)[number];
    }>,
  ) {
    onChange(
      timeValueFromParts(
        nextParts.hours12 ?? hours12,
        nextParts.minutes ?? minutes,
        nextParts.period ?? period,
      ),
    );
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${formatTimeDisplay(value)}`}
        onClick={() => setTimeOpen(!open)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-4 text-start text-base font-semibold shadow-sm transition hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span dir="ltr">{formatTimeDisplay(value)}</span>
        <Clock className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          dir="rtl"
          className="absolute end-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-4rem))] max-w-full overflow-hidden rounded-lg border border-border/80 bg-popover text-popover-foreground shadow-2xl shadow-black/25"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-3 py-3">
            <div>
              <div className="text-sm font-bold">{ariaLabel}</div>
              <div className="mt-1 text-xs text-muted-foreground">اختار الوقت المناسب للعرض</div>
            </div>
            <div className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 font-mono text-sm font-bold text-primary">
              {formatTimeDisplay(value)}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_76px] gap-3 p-3">
            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">الساعة</div>
              <div className="grid max-h-48 gap-1 overflow-y-auto pe-1">
                {scheduleHourOptions.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => updateTime({ hours12: hour })}
                    className={cn(
                      "h-9 rounded-md text-sm font-semibold transition hover:bg-accent hover:text-foreground",
                      hours12 === hour
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                        : "bg-muted/25 text-foreground",
                    )}
                  >
                    {padDatePart(hour)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">الدقيقة</div>
              <div className="grid max-h-48 gap-1 overflow-y-auto pe-1">
                {scheduleMinuteOptions.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => updateTime({ minutes: minute })}
                    className={cn(
                      "h-9 rounded-md font-mono text-sm font-semibold transition hover:bg-accent hover:text-foreground",
                      minutes === minute
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                        : "bg-muted/25 text-foreground",
                    )}
                  >
                    {padDatePart(minute)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">الفترة</div>
              <div className="grid gap-2">
                {schedulePeriodOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateTime({ period: option })}
                    className={cn(
                      "h-12 rounded-md border text-sm font-bold transition hover:border-primary/40 hover:bg-accent",
                      period === option
                        ? "border-primary bg-primary text-primary-foreground hover:bg-primary"
                        : "border-border bg-background text-foreground",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTimeOpen(false)}
                className="mt-3 h-10 w-full rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                تم
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
