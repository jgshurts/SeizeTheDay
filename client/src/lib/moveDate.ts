import { addDays, toLocalDateKey } from "./date";

// Bumping forward by one day is the common case, but for something already
// overdue by more than a day, jumping all the way to tomorrow would
// overshoot -- so the default never goes further out than a one-day nudge
// past the latest date involved (ISO date strings compare lexicographically,
// so a plain string comparison works as a min).
export function defaultMoveDate(latestDate: string): string {
  const tomorrow = addDays(toLocalDateKey(new Date()), 1);
  const dayAfterLatest = addDays(latestDate, 1);
  return tomorrow < dayAfterLatest ? tomorrow : dayAfterLatest;
}
