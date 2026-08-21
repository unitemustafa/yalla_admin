export function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function formatTimeInputValue(date: Date) {
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

export function formatLocalIsoDateTime(date: Date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const offsetRemainderMinutes = absoluteOffset % 60;

  return [
    `${formatDateInputValue(date)}T${formatTimeInputValue(date)}:${padDatePart(date.getSeconds())}`,
    `${sign}${padDatePart(offsetHours)}:${padDatePart(offsetRemainderMinutes)}`,
  ].join("");
}

export function currentScheduleValues(now = new Date()) {
  return {
    date: formatDateInputValue(now),
    time: formatTimeInputValue(now),
  };
}
