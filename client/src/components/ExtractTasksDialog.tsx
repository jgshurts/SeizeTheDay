import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { api } from "../lib/api";
import { toLocalDateKey } from "../lib/date";
import { parseBulletTasks } from "../lib/extractTasks";
import { computeDefaultTaskPriority } from "../lib/taskDefaults";
import type { Note, PriorityGroup, Task } from "../types";

// Turns each '*' bullet line of a note into a task on a chosen date, in the
// note's project. Each task starts with an "@REF " link back to the note.
// A line is skipped when an identical task already exists: for a note with
// a ref, on any date (so re-extracting after tasks were moved or completed
// adds nothing); for one without, on the chosen date only.
export function ExtractTasksDialog({
  note,
  onDone,
  onClose,
}: {
  note: Note;
  onDone: () => void;
  onClose: () => void;
}) {
  const prefix = note.shortRef ? `@${note.shortRef} ` : "";
  const descriptions = [...new Set(parseBulletTasks(note.noteText).map((l) => prefix + l))];
  const [date, setDate] = useState(() => toLocalDateKey(new Date()));
  // Tasks on the chosen date (for priority numbering), and tasks carrying
  // this note's ref on any date (for duplicate detection); null while loading.
  const [dateTasks, setDateTasks] = useState<Task[] | null>(null);
  const [refTasks, setRefTasks] = useState<Task[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!note.shortRef) {
      setRefTasks([]);
      return;
    }
    api
      .get<Task[]>(`/tasks/search?${new URLSearchParams({ q: `@${note.shortRef}`, includeCompleted: "true" })}`)
      .then(setRefTasks)
      .catch(() => setError("Could not check for existing tasks"));
  }, [note.shortRef]);

  useEffect(() => {
    if (!date) return;
    setDateTasks(null);
    let stale = false;
    api
      .get<Task[]>(`/tasks?date=${date}&includeCompleted=true`)
      .then((t) => !stale && setDateTasks(t))
      .catch(() => !stale && setError("Could not load tasks for that date"));
    return () => {
      stale = true;
    };
  }, [date]);

  const ready = dateTasks !== null && refTasks !== null;
  const existingKeys = new Set(
    (note.shortRef ? (refTasks ?? []) : (dateTasks ?? [])).map((t) => t.description.trim().toLowerCase()),
  );
  const lines = descriptions.filter((d) => !existingKeys.has(d.toLowerCase()));
  const skipped = descriptions.length - lines.length;

  async function handleOk() {
    if (!ready || !date || lines.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const priorityGroups = await api.get<PriorityGroup[]>("/priority-groups");
      const tasks = [...(dateTasks ?? [])];
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
        {descriptions.length === 0
          ? "No lines starting with * were found in this note."
          : !ready
            ? "Checking for existing tasks..."
            : lines.length === 0
              ? "All tasks from this note have already been added."
              : `${lines.length} task${lines.length === 1 ? "" : "s"} will be added${
                  note.project ? ` to ${note.project.name}` : ""
                }.`}
        {ready && skipped > 0 && lines.length > 0 && ` ${skipped} already exist${skipped === 1 ? "s" : ""} and will be skipped.`}
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
          disabled={busy || !ready || !date || lines.length === 0}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Adding..." : "Ok"}
        </button>
      </div>
    </Modal>
  );
}
