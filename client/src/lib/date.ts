export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Unlike toDateKey (UTC, used for the app's internal date-key arithmetic),
// this reads the date from the browser's local time zone -- what a user
// means by "today" is their own calendar date, not UTC's.
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(key: string, delta: number): string {
  const date = fromDateKey(key);
  date.setUTCDate(date.getUTCDate() + delta);
  return toDateKey(date);
}

export function formatWeekday(key: string, short = false): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: short ? "short" : "long",
    timeZone: "UTC",
  });
}

export function formatDisplay(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
