import type { PriorityGroup, Task } from "../types";

// New tasks default to priority group 'A', ordered after the day's current
// highest 'A' ordinal. Shared by the Tasks column's own "New task" button
// and Notes' "Add related task" so both create tasks the same way.
export function computeDefaultTaskPriority(
  tasks: Task[],
  priorityGroups: PriorityGroup[],
): { priorityGroupId: string | null; prtyOrdinal: number | null } {
  const groupA = priorityGroups.find((pg) => pg.prtyCode === "A");
  if (!groupA) return { priorityGroupId: null, prtyOrdinal: null };

  const maxOrdinalInA = tasks
    .filter((t) => t.priorityGroup?.prtyCode === "A" && t.prtyOrdinal !== null)
    .reduce((max, t) => Math.max(max, t.prtyOrdinal as number), 0);

  return { priorityGroupId: groupA.id, prtyOrdinal: maxOrdinalInA + 1 };
}
