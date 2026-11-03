import type { RecurringTask } from "@prisma/client";
import { prisma } from "./prisma";
import { parseDateParam } from "./date";
import { HORIZON_DAYS, RecurrenceRule, addDays, occurrenceDates } from "./recurrence";

// Same meaning as INCOMPLETE_FILTER in routes/tasks.ts: no status at all, or
// one not flagged isComplete.
const INCOMPLETE = { OR: [{ status: null }, { status: { isComplete: false } }] };

export const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

export function ruleOf(series: RecurringTask): RecurrenceRule {
  return {
    frequency: series.frequency,
    interval: series.interval,
    weekdays: series.weekdays,
    monthDay: series.monthDay,
    month: series.month,
    startDate: toDateKey(series.startDate),
    endDate: series.endDate ? toDateKey(series.endDate) : null,
  };
}

// Brings a user's series up to date as of `today` (their local calendar
// date, sent by the browser): drops missed occurrences of "skip if missed"
// series, then creates ordinary tasks for the days between what was last
// generated and HORIZON_DAYS ahead. Safe to call as often as you like.
// Returns how many tasks were created.
export async function syncRecurringTasks(userId: bigint, today: string, onlySeriesId?: bigint): Promise<number> {
  const todayDate = parseDateParam(today);
  if (!todayDate) throw new Error("today must be YYYY-MM-DD");

  const allSeries = await prisma.recurringTask.findMany({
    where: { ownerId: userId, ...(onlySeriesId ? { id: onlySeriesId } : {}) },
  });
  if (allSeries.length === 0) return 0;

  // As with a hand-made task, new occurrences start in the default status
  // (e.g. "Not Started") rather than none, which would sort them last.
  const defaultStatus = await prisma.status.findFirst({ where: { isDefault: true } });
  const horizon = addDays(today, HORIZON_DAYS);

  let created = 0;
  for (const series of allSeries) {
    if (series.skipIfMissed) {
      await prisma.task.deleteMany({
        where: { seriesId: series.id, datePlanned: { lt: todayDate }, ...INCOMPLETE },
      });
    }

    const through = series.generatedThrough ? toDateKey(series.generatedThrough) : null;
    const from = through && addDays(through, 1) > today ? addDays(through, 1) : today;
    if (from > horizon) continue;

    const dates = occurrenceDates(ruleOf(series), from, horizon);
    if (dates.length > 0) {
      const result = await prisma.task.createMany({
        skipDuplicates: true,
        data: dates.map((date) => ({
          description: series.description,
          datePlanned: parseDateParam(date)!,
          ownerId: userId,
          assigneeId: userId,
          projectId: series.projectId,
          priorityGroupId: series.priorityGroupId,
          statusId: defaultStatus?.id ?? null,
          seriesId: series.id,
        })),
      });
      created += result.count;
    }
    await prisma.recurringTask.update({
      where: { id: series.id },
      data: { generatedThrough: parseDateParam(horizon)! },
    });
  }
  return created;
}

// Removes a series' occurrences from `today` on that nobody has finished;
// anything already done, or in the past, stays as history.
export function deleteUpcomingOccurrences(seriesId: bigint, today: string) {
  return prisma.task.deleteMany({
    where: { seriesId, datePlanned: { gte: parseDateParam(today)! }, ...INCOMPLETE },
  });
}
