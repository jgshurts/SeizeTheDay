import type { Task } from "../types";

// Mirrors the server's default order (status.ordinal, priorityGroup.prty,
// prtyOrdinal) so the grid can re-sort itself immediately after a Sta/PG/PR
// edit instead of waiting for the next fetch to catch up.
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusOrdA = a.status?.ordinal ?? Infinity;
    const statusOrdB = b.status?.ordinal ?? Infinity;
    if (statusOrdA !== statusOrdB) return statusOrdA - statusOrdB;

    const prtyA = a.priorityGroup?.prty ?? Infinity;
    const prtyB = b.priorityGroup?.prty ?? Infinity;
    if (prtyA !== prtyB) return prtyA - prtyB;

    const ordA = a.prtyOrdinal ?? Infinity;
    const ordB = b.prtyOrdinal ?? Infinity;
    return ordA - ordB;
  });
}
