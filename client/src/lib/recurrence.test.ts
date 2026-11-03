import { describeRule } from "./recurrence";

const base = { interval: 1, weekdays: [], monthDay: null, month: null };

describe("describeRule", () => {
  it.each([
    [{ ...base, frequency: "DAILY" as const }, "Every day"],
    [{ ...base, frequency: "DAILY" as const, interval: 3 }, "Every 3 days"],
    [{ ...base, frequency: "WEEKLY" as const, weekdays: [2] }, "Every Tuesday"],
    [{ ...base, frequency: "WEEKLY" as const, weekdays: [1, 4] }, "Every Mon, Thu"],
    [{ ...base, frequency: "WEEKLY" as const, interval: 2, weekdays: [1, 4] }, "Every 2 weeks on Mon, Thu"],
    [{ ...base, frequency: "MONTHLY" as const, monthDay: 1 }, "Every month on the 1st"],
    [{ ...base, frequency: "MONTHLY" as const, monthDay: 22 }, "Every month on the 22nd"],
    [{ ...base, frequency: "MONTHLY" as const, monthDay: 13 }, "Every month on the 13th"],
    [{ ...base, frequency: "MONTHLY" as const, interval: 3, monthDay: -1 }, "Every 3 months on the last day"],
    [{ ...base, frequency: "YEARLY" as const, month: 2, monthDay: 29 }, "Every year on February 29"],
  ])("describes %j", (rule, text) => {
    expect(describeRule(rule)).toBe(text);
  });
});
