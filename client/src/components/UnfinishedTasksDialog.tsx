import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { MoveTasksDialog } from "./MoveTasksDialog";
import type { TaskMove } from "./MoveTasksDialog";
import { api } from "../lib/api";
import { formatDisplay, toLocalDateKey } from "../lib/date";
import { defaultMoveDate } from "../lib/moveDate";
import type { Project, Task } from "../types";

const NONE = "";

export function UnfinishedTasksDialog({
  activeDate,
  projects,
  onUpdateTask,
  onClose,
}: {
  activeDate: string;
  projects: Project[];
  onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  // Defaults to the day currently in view -- "everything left behind before
  // today's (or whichever day's) list" is the common case that prompted this
  // dialog, but it's adjustable for a narrower or wider sweep.
  const [before, setBefore] = useState(activeDate);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  async function fetchTasks() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ before });
      if (projectId) params.set("projectId", projectId);
      const fetched = await api.get<Task[]>(`/tasks/unfinished?${params.toString()}`);
      setTasks(fetched);
      setSelectedIds((prev) => new Set([...prev].filter((id) => fetched.some((t) => t.id === id))));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, [before, projectId]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < tasks.length;
    }
  }, [selectedIds, tasks.length]);

  function toggleSelect(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === tasks.length ? new Set() : new Set(tasks.map((t) => t.id))));
  }

  async function handleMove(moves: TaskMove[]) {
    await Promise.all(moves.map(({ taskId, date }) => onUpdateTask(taskId, { datePlanned: date })));
    setSelectedIds(new Set());
    await fetchTasks();
  }

  const selectedTasks = tasks.filter((t) => selectedIds.has(t.id));

  if (moving) {
    return (
      <MoveTasksDialog
        title="Move Unfinished Tasks"
        emptyMessage="No tasks selected."
        initialDate={defaultMoveDate(toLocalDateKey(new Date()))}
        tasks={selectedTasks}
        onMove={handleMove}
        onClose={() => setMoving(false)}
      />
    );
  }

  return (
    <Modal title="Unfinished Tasks" onClose={onClose} maxWidthClassName="max-w-[772px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-sm text-slate-600">
            Before
            <input
              type="date"
              aria-label="Before date"
              value={before}
              onChange={(e) => setBefore(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>

          <select
            aria-label="Filter by project"
            value={projectId ?? NONE}
            onChange={(e) => setProjectId(e.target.value || null)}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value={NONE}>All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setMoving(true)}
          disabled={selectedIds.size === 0}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Move Selected ({selectedIds.size})
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Nothing unfinished before {formatDisplay(before)}.
        </p>
      ) : (
        <div className="max-h-[55vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200">
                <th className="w-6 px-2 py-1.5 text-center">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    aria-label="Select all tasks"
                    checked={tasks.length > 0 && selectedIds.size === tasks.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-2 py-1.5 font-medium text-slate-600">Date</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">Status</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">PG</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">PR</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">Description</th>
                <th className="px-2 py-1.5 font-medium text-slate-600">Project</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${t.description}`}
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">
                    {formatDisplay(t.datePlanned.slice(0, 10))}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: t.status?.backgroundColor ?? undefined,
                        color: t.status?.foregroundColor ?? undefined,
                      }}
                    >
                      {t.status?.statusCode ?? "-"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-slate-700">{t.priorityGroup?.prtyCode ?? ""}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.prtyOrdinal ?? ""}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.description}</td>
                  <td className="px-2 py-1.5 text-slate-700">{t.project?.name ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
