export const EVENT_TIME_ZONE = "Asia/Ho_Chi_Minh";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseEventDate(value: Date | string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("Invalid event date");
    return value;
  }

  const normalized = String(value || "").trim();
  const parsed = DATE_ONLY_PATTERN.test(normalized)
    ? new Date(`${normalized}T00:00:00+07:00`)
    : new Date(normalized);

  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid event date");
  return parsed;
}

export function formatEventDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
    timeZone: EVENT_TIME_ZONE,
  }).format(parseEventDate(value));
}

export function eventDateToInputValue(value: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parseEventDate(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}