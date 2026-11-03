// Works out which days a recurring series lands on. Pure functions over
// YYYY-MM-DD strings (UTC calendar arithmetic, no time zones involved), so
// "the 1st" or "every Tuesday" means the same calendar date for everyone.

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurrenceRule {
  frequency: Frequency;
  interval: number;
  // WEEKLY: 0 = Sunday .. 6 = Saturday. Empty means the start date's weekday.
  weekdays: number[];
  // MONTHLY / YEARLY: 1-31, or -1 for the last day. Null means the start date's day.
  monthDay: number | null;
  // YEARLY: 1-12. Null means the start date's month.
  month: number | null;
  startDate: string;
  endDate: string | null;
}

// How far ahead of today occurrences are created.
export const HORIZON_DAYS = 60;

interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

function parse(key: string): Ymd {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

function toKey({ y, m, d }: Ymd): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const utcMs = ({ y, m, d }: Ymd) => Date.UTC(y, m - 1, d);

export function addDays(key: string, delta: number): string {
  const date = new Date(utcMs(parse(key)) + delta * DAY_MS);
  return toKey({ y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() });
}

function daysBetween(a: Ymd, b: Ymd): number {
  return Math.round((utcMs(b) - utcMs(a)) / DAY_MS);
}

const weekdayOf = (ymd: Ymd) => new Date(utcMs(ymd)).getUTCDay();
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// The day of the month a rule means in a given month: a day the month
// doesn't have (the 31st in April, the 29th in a common February) lands on
// its last day instead of being skipped, so a monthly payment never vanishes.
function targetDay(monthDay: number, y: number, m: number): number {
  const last = daysInMonth(y, m);
  return monthDay === -1 ? last : Math.min(monthDay, last);
}

function matches(rule: RecurrenceRule, start: Ymd, day: Ymd): boolean {
  switch (rule.frequency) {
    case "DAILY":
      return daysBetween(start, day) % rule.interval === 0;

    case "WEEKLY": {
      const weekdays = rule.weekdays.length > 0 ? rule.weekdays : [weekdayOf(start)];
      if (!weekdays.includes(weekdayOf(day))) return false;
      // Weeks run Sunday to Saturday and are counted from the start date's
      // week, so "every 2 weeks" keeps its rhythm.
      const startOfStartWeek = daysBetween({ y: 1970, m: 1, d: 4 }, start) - weekdayOf(start);
      const startOfDayWeek = daysBetween({ y: 1970, m: 1, d: 4 }, day) - weekdayOf(day);
      return ((startOfDayWeek - startOfStartWeek) / 7) % rule.interval === 0;
    }

    case "MONTHLY": {
      const monthsApart = (day.y - start.y) * 12 + (day.m - start.m);
      if (monthsApart % rule.interval !== 0) return false;
      return day.d === targetDay(rule.monthDay ?? start.d, day.y, day.m);
    }

    case "YEARLY": {
      if ((day.y - start.y) % rule.interval !== 0) return false;
      if (day.m !== (rule.month ?? start.m)) return false;
      return day.d === targetDay(rule.monthDay ?? start.d, day.y, day.m);
    }
  }
}

// Every date in [from, to] (inclusive) the rule lands on, oldest first,
// never before its start date or after its end date.
export function occurrenceDates(rule: RecurrenceRule, from: string, to: string): string[] {
  const first = from > rule.startDate ? from : rule.startDate;
  const last = rule.endDate && rule.endDate < to ? rule.endDate : to;
  if (first > last) return [];

  const start = parse(rule.startDate);
  const dates: string[] = [];
  for (let key = first; key <= last; key = addDays(key, 1)) {
    if (matches(rule, start, parse(key))) dates.push(key);
  }
  return dates;
}

// What the API accepts for a new or changed series. Returns the cleaned rule
// or a message the user can act on.
export function validateRule(input: Record<string, unknown>): { rule: RecurrenceRule } | { error: string } {
  const frequency = input.frequency;
  if (frequency !== "DAILY" && frequency !== "WEEKLY" && frequency !== "MONTHLY" && frequency !== "YEARLY") {
    return { error: "frequency must be DAILY, WEEKLY, MONTHLY or YEARLY" };
  }

  const interval = input.interval ?? 1;
  if (!Number.isInteger(interval) || (interval as number) < 1 || (interval as number) > 365) {
    return { error: "interval must be a whole number from 1 to 365" };
  }

  const isDateKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isDateKey(input.startDate)) return { error: "startDate must be YYYY-MM-DD" };
  const endDate = input.endDate ?? null;
  if (endDate !== null && !isDateKey(endDate)) return { error: "endDate must be YYYY-MM-DD or empty" };
  if (endDate !== null && endDate < input.startDate) return { error: "endDate can't be before startDate" };

  let weekdays: number[] = [];
  if (frequency === "WEEKLY") {
    const raw = input.weekdays ?? [];
    if (!Array.isArray(raw) || raw.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      return { error: "weekdays must be numbers 0 (Sunday) to 6 (Saturday)" };
    }
    weekdays = [...new Set(raw as number[])].sort();
    if (weekdays.length === 0) return { error: "Pick at least one weekday" };
  }

  let monthDay: number | null = null;
  let month: number | null = null;
  if (frequency === "MONTHLY" || frequency === "YEARLY") {
    monthDay = (input.monthDay ?? null) as number | null;
    if (monthDay !== -1 && (!Number.isInteger(monthDay) || (monthDay as number) < 1 || (monthDay as number) > 31)) {
      return { error: "monthDay must be 1 to 31, or -1 for the last day" };
    }
  }
  if (frequency === "YEARLY") {
    month = (input.month ?? null) as number | null;
    if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12) {
      return { error: "month must be 1 to 12" };
    }
  }

  return {
    rule: {
      frequency,
      interval: interval as number,
      weekdays,
      monthDay,
      month,
      startDate: input.startDate,
      endDate: endDate as string | null,
    },
  };
}
