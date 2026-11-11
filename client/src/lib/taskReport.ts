import type { Task } from "../types";

export type ReportCategory = "completed" | "inProgress" | "blocked" | "notStarted";

// Report order: completed first, then in progress, blocked, not started.
export const REPORT_CATEGORIES: { key: ReportCategory; label: string }[] = [
  { key: "completed", label: "Completed" },
  { key: "inProgress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "notStarted", label: "Not Started" },
];

// Statuses are user-defined and only isComplete / isBlocked are flagged, so
// "in progress" is recognized the way the CSV export does (code ">") or by
// its description. Anything else, including no status, is "not started".
export function reportCategory(task: Task): ReportCategory {
  const status = task.status;
  if (!status) return "notStarted";
  if (status.isComplete) return "completed";
  if (status.isBlocked) return "blocked";
  if (status.statusCode === ">" || /progress/i.test(status.description ?? "")) return "inProgress";
  return "notStarted";
}

export function groupTasksForReport(tasks: Task[]): { key: ReportCategory; label: string; tasks: Task[] }[] {
  return REPORT_CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    tasks: tasks
      .filter((t) => reportCategory(t) === key)
      .sort(
        (a, b) =>
          a.datePlanned.localeCompare(b.datePlanned) ||
          (a.priorityGroup?.prty ?? Infinity) - (b.priorityGroup?.prty ?? Infinity) ||
          (a.prtyOrdinal ?? Infinity) - (b.prtyOrdinal ?? Infinity),
      ),
  }));
}
