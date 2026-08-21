import type { DateRange } from "./types";

export function createMonthFormatter(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
}

export function createDateButtonFormatter(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function createWeekdayLabels(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const sunday = new Date(2026, 4, 24);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return formatter.format(date);
  });
}

export function sameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function atStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDate(value: Date) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

export function createDefaultDateRange(): DateRange {
  const today = atStartOfDay(new Date());

  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: today,
  };
}

export function dateRangeError(range: DateRange) {
  if (!isValidDate(range.from) || !isValidDate(range.to)) {
    return "الرجاء اختيار تاريخ صحيح";
  }

  if (atStartOfDay(range.from) > atStartOfDay(range.to)) {
    return "تاريخ البداية يجب أن يكون قبل تاريخ النهاية";
  }

  return null;
}

export function isInRange(date: Date, range: DateRange) {
  const time = atStartOfDay(date).getTime();
  return (
    time >= atStartOfDay(range.from).getTime() &&
    time <= atStartOfDay(range.to).getTime()
  );
}

export function getCalendarCells(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = firstDay.getDay();
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - leadingDays + 1;
    const date = new Date(year, month, dayNumber);

    return {
      date,
      currentMonth: date.getMonth() === month,
    };
  });
}
