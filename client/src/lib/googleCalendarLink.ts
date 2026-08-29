import { fromDateKey } from "./date";

// Deep-links into calendar.google.com's own "create event on this day" UI
// -- no API scope needed, it just opens the user's own logged-in session.
export function googleCalendarDayUrl(dateKey: string): string {
  const d = fromDateKey(dateKey);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `https://calendar.google.com/calendar/r/day/${y}/${m}/${day}`;
}
