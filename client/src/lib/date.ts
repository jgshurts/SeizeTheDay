export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(key: string, delta: number): string {
  const date = fromDateKey(key);
  date.setUTCDate(date.getUTCDate() + delta);
  return toDateKey(date);
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
