"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useDashboardI18n } from "../i18n";
import { Button } from "../primitives";
import {
  atStartOfDay,
  createDateButtonFormatter,
  createMonthFormatter,
  createWeekdayLabels,
  getCalendarCells,
  isInRange,
  sameDate,
} from "./date-range";
import type { DateField, DateRange } from "./types";

export function OverviewDateActions({
  range,
  loading,
  onRangeChange,
  onRefresh,
}: {
  range: DateRange;
  loading: boolean;
  onRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
}) {
  const { direction, numberLocale, t } = useDashboardI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeField, setActiveField] = useState<DateField | null>(null);

  useEffect(() => {
    function handlePointerDown(event: globalThis.PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setActiveField(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveField(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function updateDate(field: DateField, date: Date) {
    const nextDate = atStartOfDay(date);

    onRangeChange({
      ...range,
      [field]: nextDate,
    });
    setActiveField(null);
  }

  return (
    <div
      ref={rootRef}
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-label={t("common.dateRangeFilter")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-foreground">{t("common.from")}</span>
        <DatePickerButton
          field="from"
          label={t("common.startDate")}
          date={range.from}
          range={range}
          activeField={activeField}
          onOpenChange={setActiveField}
          onSelect={updateDate}
          direction={direction}
          locale={numberLocale}
        />
        <span className="text-muted-foreground">-</span>
        <span className="text-foreground">{t("common.to")}</span>
        <DatePickerButton
          field="to"
          label={t("common.endDate")}
          date={range.to}
          range={range}
          activeField={activeField}
          onOpenChange={setActiveField}
          onSelect={updateDate}
          direction={direction}
          locale={numberLocale}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 w-[116px] self-start"
        disabled={loading}
        onClick={onRefresh}
      >
        <RefreshCcw className={cn("size-4", loading && "animate-spin")} />
        {loading ? t("common.loading") : t("common.refresh")}
      </Button>
    </div>
  );
}

function DatePickerButton({
  field,
  label,
  date,
  range,
  activeField,
  onOpenChange,
  onSelect,
  direction,
  locale,
}: {
  field: DateField;
  label: string;
  date: Date;
  range: DateRange;
  activeField: DateField | null;
  onOpenChange: (field: DateField | null) => void;
  onSelect: (field: DateField, date: Date) => void;
  direction: "rtl" | "ltr";
  locale: string;
}) {
  const open = activeField === field;
  const dateButtonFormatter = useMemo(
    () => createDateButtonFormatter(locale),
    [locale],
  );

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "h-10 w-[186px] justify-between bg-background text-start font-normal text-foreground",
          open && "border-primary text-primary ring-1 ring-primary/20",
        )}
        onClick={() => onOpenChange(open ? null : field)}
      >
        <span className="truncate">{dateButtonFormatter.format(date)}</span>
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      {open ? (
        <DatePickerPopover
          field={field}
          selectedDate={date}
          range={range}
          onSelect={onSelect}
          direction={direction}
          locale={locale}
        />
      ) : null}
    </div>
  );
}

function DatePickerPopover({
  field,
  selectedDate,
  range,
  onSelect,
  direction,
  locale,
}: {
  field: DateField;
  selectedDate: Date;
  range: DateRange;
  onSelect: (field: DateField, date: Date) => void;
  direction: "rtl" | "ltr";
  locale: string;
}) {
  const { t } = useDashboardI18n();
  const [viewDate, setViewDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const cells = useMemo(() => getCalendarCells(viewDate), [viewDate]);
  const monthFormatter = useMemo(() => createMonthFormatter(locale), [locale]);
  const weekdayLabels = useMemo(() => createWeekdayLabels(locale), [locale]);

  function moveMonth(offset: number) {
    setViewDate((currentDate) => {
      return new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + offset,
        1,
      );
    });
  }

  return (
    <div
      className={cn(
        "absolute top-full z-40 mt-2 w-[308px] rounded-lg border bg-background p-3 text-foreground shadow-xl",
        direction === "rtl" ? "right-0" : "left-0",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label={t("common.previousMonth")}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => moveMonth(-1)}
        >
          <ChevronRight className="size-4" />
        </button>
        <div className="text-sm font-semibold">
          {monthFormatter.format(viewDate)}
        </div>
        <button
          type="button"
          aria-label={t("common.nextMonth")}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => moveMonth(1)}
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {weekdayLabels.map((day) => (
          <div key={day} className="flex h-8 items-center justify-center">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map(({ date, currentMonth }) => {
          const selected = sameDate(date, selectedDate);
          const rangeEdge = sameDate(date, range.from) || sameDate(date, range.to);
          const insideRange = isInRange(date, range);

          return (
            <button
              type="button"
              key={date.toISOString()}
              className={cn(
                "flex h-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                !currentMonth && "text-muted-foreground/45",
                insideRange && "bg-primary/10 text-primary",
                rangeEdge && "font-semibold",
                selected &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
              onClick={() => onSelect(field, date)}
            >
              {date.getDate().toLocaleString(locale)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
