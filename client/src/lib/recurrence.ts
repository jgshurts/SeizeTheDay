import type { RecurringTask } from "../types";

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

const dayOfMonth = (monthDay: number | null) =>
  monthDay === -1 ? "last day" : monthDay ? `${ordinal(monthDay)}` : "start date's day";

type RuleFields = Pick<RecurringTask, "frequency" | "interval" | "weekdays" | "monthDay" | "month">;

// A plain-English summary of a rule, for the list in Settings > Recurring.
export function describeRule(rule: RuleFields): string {
  const every = (unit: string, plural: string) =>
    rule.interval === 1 ? `Every ${unit}` : `Every ${rule.interval} ${plural}`;

  switch (rule.frequency) {
    case "DAILY":
      return every("day", "days");
    case "WEEKLY": {
      const names = rule.weekdays.map((d) => WEEKDAY_NAMES[d]);
      const days = names.length <= 1 ? names.join("") : names.map((n) => n.slice(0, 3)).join(", ");
      return rule.interval === 1 ? `Every ${days}` : `Every ${rule.interval} weeks on ${days}`;
    }
    case "MONTHLY":
      return `${every("month", "months")} on the ${dayOfMonth(rule.monthDay)}`;
    case "YEARLY": {
      const month = rule.month ? MONTH_NAMES[rule.month - 1] : "";
      const day = rule.monthDay === -1 ? `the last day of ${month}` : `${month} ${rule.monthDay ?? ""}`.trim();
      return `${every("year", "years")} on ${day}`;
    }
  }
}
