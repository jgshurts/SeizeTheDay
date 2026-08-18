import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { PriorityGroup, Status, Task } from "../types";

interface TasksColumnProps {
  activeDate: string;
}

const NONE = "";

export function TasksColumn({ activeDate }: TasksColumnProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorityGroups, setPriorityGroups] = useState<PriorityGroup[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [newPriorityGroupId, setNewPriorityGroupId] = useState<string | null>(null);
  const [newPrtyOrdinal, setNewPrtyOrdinal] = useState<number | null>(null);

  useEffect(() => {
    api.get<Status[]>("/statuses").then(setStatuses);
    api.get<PriorityGroup[]>("/priority-groups").then(setPriorityGroups);
  }, []);

  useEffect(() => {
    api
      .get<Task[]>(`/tasks?date=${activeDate}&includeCompleted=${showCompleted}`)
      .then(setTasks);
  }, [activeDate, showCompleted]);

  function startAdding() {
    const groupA = priorityGroups.find((pg) => pg.prtyCode === "A");
    const maxOrdinalInA = tasks
      .filter((t) => t.priorityGroup?.prtyCode === "A" && t.prtyOrdinal !== null)
      .reduce((max, t) => Math.max(max, t.prtyOrdinal as number), 0);

    setNewPriorityGroupId(groupA?.id ?? null);
    setNewPrtyOrdinal(groupA ? maxOrdinalInA + 1 : null);
    setAdding(true);
  }

  // Ctrl/Cmd+T is reserved by the browser for opening a new tab, so we use
  // Alt/Option+T instead -- the only reliable "New Task" shortcut a page
  // can actually receive. Checking e.code (not e.key) sidesteps the special
  // characters macOS produces for Option+letter combos.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.code === "KeyT") {
        e.preventDefault();
        startAdding();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tasks, priorityGroups]);

  async function addTask() {
    if (!newDescription.trim()) {
      setAdding(false);
      return;
    }
    const task = await api.post<Task>("/tasks", {
      description: newDescription.trim(),
      datePlanned: activeDate,
      priorityGroupId: newPriorityGroupId,
      prtyOrdinal: newPrtyOrdinal,
    });
    setTasks((prev) => [...prev, task]);
    setNewDescription("");
    setAdding(false);
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const updated = await api.patch<Task>(`/tasks/${id}`, patch);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function deleteTask(id: string) {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <section className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Tasks</h2>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show completed
        </label>
      </div>

      <button
        type="button"
        onClick={startAdding}
        className="mb-2 flex w-fit items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-sm text-white hover:bg-indigo-700"
      >
        <Plus size={16} /> New task
      </button>

      <div className="flex-1 overflow-y-auto rounded border border-slate-200">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="w-12 px-2 py-1 text-center">Sta</th>
              <th className="w-12 px-2 py-1 text-center">PG</th>
              <th className="w-12 px-2 py-1 text-center">PR</th>
              <th className="px-2 py-1">Description</th>
              <th className="w-8 px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-t border-slate-100">
                <td className="px-2 py-1" />
                <td className="px-2 py-1 text-center text-xs text-slate-400">
                  {priorityGroups.find((pg) => pg.id === newPriorityGroupId)?.prtyCode ?? "-"}
                </td>
                <td className="px-2 py-1 text-center text-xs text-slate-400">
                  {newPrtyOrdinal ?? "-"}
                </td>
                <td className="px-2 py-1">
                  <input
                    autoFocus
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    onBlur={addTask}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    className="w-full rounded border border-slate-300 px-1 py-0.5"
                    placeholder="Task description"
                  />
                </td>
                <td />
              </tr>
            )}
            {tasks.map((task) => (
              <tr key={task.id} className="border-t border-slate-100">
                <td className="px-2 py-1">
                  <select
                    value={task.statusId ?? NONE}
                    onChange={(e) => updateTask(task.id, { statusId: e.target.value || null })}
                    title={task.status?.description ?? undefined}
                    style={{
                      backgroundColor: task.status?.backgroundColor ?? undefined,
                      color: task.status?.foregroundColor ?? undefined,
                      textAlignLast: "center",
                    }}
                    className="w-full appearance-none rounded border border-slate-200 bg-white text-center text-xs"
                  >
                    <option value={NONE}>-</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.statusCode}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={task.priorityGroupId ?? NONE}
                    onChange={(e) =>
                      updateTask(task.id, { priorityGroupId: e.target.value || null })
                    }
                    style={{ textAlignLast: "center" }}
                    className="w-full appearance-none rounded border border-slate-200 bg-white text-center text-xs"
                  >
                    <option value={NONE}>-</option>
                    {priorityGroups.map((pg) => (
                      <option key={pg.id} value={pg.id}>
                        {pg.prtyCode}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    defaultValue={task.prtyOrdinal ?? undefined}
                    onBlur={(e) =>
                      updateTask(task.id, {
                        prtyOrdinal: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-slate-200 px-1 text-center"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    defaultValue={task.description}
                    onBlur={(e) => updateTask(task.id, { description: e.target.value })}
                    className="w-full rounded border border-transparent px-1 hover:border-slate-200 focus:border-slate-300"
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    aria-label="Delete task"
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
