import type { Task } from "../types";

// Moving a task that's already done is usually a mistake (meant to pick a
// different row), so pause for a confirmation instead of silently
// rescheduling completed work. Returns false if the user backs out.
export function confirmMoveIfComplete(tasks: Task[]): boolean {
  if (!tasks.some((t) => t.status?.isComplete)) return true;
  const message =
    tasks.length === 1
      ? "This task is already marked complete. Move it anyway?"
      : "One or more of these tasks are already marked complete. Move them anyway?";
  return window.confirm(message);
}
