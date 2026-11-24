import { useState } from "react";
import { Modal } from "./Modal";
import { api } from "../lib/api";
import { toLocalDateKey } from "../lib/date";
import { parseBulletTasks } from "../lib/extractTasks";
import { computeDefaultTaskPriority } from "../lib/taskDefaults";
import type { Note, PriorityGroup, Task } from "../types";

// Turns each '*' bullet line of a note into a task on a chosen date, in the
// note's project.
export function ExtractTasksDialog({
  note,
  onDone,
  onClose,
}: {
  note: Note;
  onDone: () => void;
  onClose: () => void;
}) {
  const lines = parseBulletTasks(note.noteText);
  const [date, setDate] = useState(() => toLocalDateKey(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOk() {
    if (!date || lines.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const [priorityGroups, existing] = await Promise.all([
        api.get<PriorityGroup[]>("/priority-groups"),
        api.get<Task[]>(`/tasks?date=${date}&includeCompleted=true`),
      ]);
      const tasks = [...existing];
      for (const description of lines) {
        const { priorityGroupId, prtyOrdinal } = computeDefaultTaskPriority(tasks, priorityGroups);
        const task = await api.post<Task>("/tasks", {
          description,
          datePlanned: date,
          priorityGroupId,
          prtyOrdinal,
          projectId: note.projectId,
        });
        tasks.push(task);
      }
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add tasks");
      setBusy(false);
    }
  }

  return (
    <Modal title="Extract Tasks" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">
        {lines.length === 0
          ? "No lines starting with * were found in this note."
          : `${lines.length} task${lines.length === 1 ? "" : "s"} will be added${
              note.project ? ` to ${note.project.name}` : ""
            }.`}
      </p>

      <label className="mb-1 block text-sm font-medium text-slate-600" htmlFor="extract-tasks-date">
        Date for new tasks
      </label>
      <input
        id="extract-tasks-date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-4 rounded border border-slate-300 px-2 py-1 text-sm"
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleOk}
          disabled={busy || !date || lines.length === 0}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Adding..." : "Ok"}
        </button>
      </div>
    </Modal>
  );
}
