import { addDays, occurrenceDates, validateRule, RecurrenceRule } from "./lib/recurrence";

const rule = (over: Partial<RecurrenceRule>): RecurrenceRule => ({
  frequency: "DAILY",
  interval: 1,
  weekdays: [],
  monthDay: null,
  month: null,
  startDate: "2026-01-01",
  endDate: null,
  ...over,
});

describe("occurrenceDates", () => {
  it("repeats every N days from the start date", () => {
    const r = rule({ interval: 3, startDate: "2026-11-01" });
    expect(occurrenceDates(r, "2026-11-01", "2026-11-12")).toEqual([
      "2026-11-01",
      "2026-11-04",
      "2026-11-07",
      "2026-11-10",
    ]);
  });

  it("keeps the rhythm when the window starts mid-series", () => {
    const r = rule({ interval: 3, startDate: "2026-11-01" });
    expect(occurrenceDates(r, "2026-11-05", "2026-11-12")).toEqual(["2026-11-07", "2026-11-10"]);
  });

  it("repeats weekly on chosen weekdays (Tuesday trash)", () => {
    // 2026-11-03 is a Tuesday.
    const r = rule({ frequency: "WEEKLY", weekdays: [2], startDate: "2026-10-01" });
    expect(occurrenceDates(r, "2026-11-01", "2026-11-30")).toEqual([
      "2026-11-03",
      "2026-11-10",
      "2026-11-17",
      "2026-11-24",
    ]);
  });

  it("supports several weekdays and every-other-week rhythm", () => {
    // Start Mon 2026-11-02; Mon+Thu every 2 weeks.
    const r = rule({ frequency: "WEEKLY", interval: 2, weekdays: [1, 4], startDate: "2026-11-02" });
    expect(occurrenceDates(r, "2026-11-01", "2026-11-30")).toEqual([
      "2026-11-02",
      "2026-11-05",
      "2026-11-16",
      "2026-11-19",
      "2026-11-30",
    ]);
  });

  it("defaults a weekly rule with no weekdays to the start date's weekday", () => {
    const r = rule({ frequency: "WEEKLY", startDate: "2026-11-03" });
    expect(occurrenceDates(r, "2026-11-01", "2026-11-15")).toEqual(["2026-11-03", "2026-11-10"]);
  });

  it("repeats monthly on a day (mortgage on the 1st)", () => {
    const r = rule({ frequency: "MONTHLY", monthDay: 1, startDate: "2026-01-01" });
    expect(occurrenceDates(r, "2026-11-01", "2027-02-28")).toEqual([
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
    ]);
  });

  it("puts a day the month lacks on its last day instead of skipping it", () => {
    const r = rule({ frequency: "MONTHLY", monthDay: 31, startDate: "2026-01-31" });
    expect(occurrenceDates(r, "2026-02-01", "2026-04-30")).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("supports 'last day of the month', including leap Februaries", () => {
    const r = rule({ frequency: "MONTHLY", monthDay: -1, startDate: "2027-01-01" });
    expect(occurrenceDates(r, "2028-01-01", "2028-03-31")).toEqual(["2028-01-31", "2028-02-29", "2028-03-31"]);
  });

  it("supports every N months", () => {
    const r = rule({ frequency: "MONTHLY", interval: 3, monthDay: 15, startDate: "2026-01-15" });
    expect(occurrenceDates(r, "2026-01-01", "2026-12-31")).toEqual([
      "2026-01-15",
      "2026-04-15",
      "2026-07-15",
      "2026-10-15",
    ]);
  });

  it("repeats yearly, with Feb 29 landing on Feb 28 in common years", () => {
    const r = rule({ frequency: "YEARLY", month: 2, monthDay: 29, startDate: "2024-02-29" });
    expect(occurrenceDates(r, "2024-01-01", "2028-12-31")).toEqual([
      "2024-02-29",
      "2025-02-28",
      "2026-02-28",
      "2027-02-28",
      "2028-02-29",
    ]);
  });

  it("never lands before the start date or after the end date", () => {
    const r = rule({ startDate: "2026-11-05", endDate: "2026-11-07" });
    expect(occurrenceDates(r, "2026-11-01", "2026-11-30")).toEqual(["2026-11-05", "2026-11-06", "2026-11-07"]);
  });

  it("returns nothing for an empty or inverted window", () => {
    expect(occurrenceDates(rule({}), "2026-11-10", "2026-11-01")).toEqual([]);
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("validateRule", () => {
  const ok = { frequency: "WEEKLY", weekdays: [2], startDate: "2026-11-03" };

  it("accepts a valid rule and fills in defaults", () => {
    const res = validateRule(ok);
    expect(res).toEqual({
      rule: { frequency: "WEEKLY", interval: 1, weekdays: [2], monthDay: null, month: null, startDate: "2026-11-03", endDate: null },
    });
  });

  it.each([
    ["unknown frequency", { ...ok, frequency: "HOURLY" }],
    ["zero interval", { ...ok, interval: 0 }],
    ["bad start date", { ...ok, startDate: "11/03/2026" }],
    ["end before start", { ...ok, endDate: "2026-11-01" }],
    ["weekly without weekdays", { ...ok, weekdays: [] }],
    ["weekday out of range", { ...ok, weekdays: [7] }],
    ["monthly with day 32", { frequency: "MONTHLY", monthDay: 32, startDate: "2026-11-03" }],
    ["yearly without a month", { frequency: "YEARLY", monthDay: 1, startDate: "2026-11-03" }],
  ])("rejects %s", (_label, input) => {
    expect(validateRule(input)).toHaveProperty("error");
  });
});
