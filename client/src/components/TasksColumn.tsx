import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { ArrowLeftRight, Plus, StickyNote, Trash2 } from "lucide-react";
import { computeDefaultTaskPriority } from "../lib/taskDefaults";
import { useIsMobile } from "../lib/useIsMobile";
import { MoveTasksDialog } from "./MoveTasksDialog";
import type { TaskMove } from "./MoveTasksDialog";
import { MobileTextEditor } from "./MobileTextEditor";
import type { PriorityGroup, Project, Status, Task } from "../types";

interface TasksColumnProps {
  activeDate: string;
  tasks: Task[];
  statuses: Status[];
  priorityGroups: PriorityGroup[];
  projects: Project[];
  showCompleted: boolean;
  onShowCompletedChange: (value: boolean) => void;
  onAddTask: (description: string) => Promise<Task>;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

const NONE = "";

export function TasksColumn({
  activeDate,
  tasks,
  statuses,
  priorityGroups,
  projects,
  showCompleted,
  onShowCompletedChange,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: TasksColumnProps) {
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [newPriorityGroupId, setNewPriorityGroupId] = useState<string | null>(null);
  const [newPrtyOrdinal, setNewPrtyOrdinal] = useState<number | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  function startAdding() {
    const { priorityGroupId, prtyOrdinal } = computeDefaultTaskPriority(tasks, priorityGroups);
    setNewPriorityGroupId(priorityGroupId);
    setNewPrtyOrdinal(prtyOrdinal);
    setAdding(true);
  }

  // Ctrl/Cmd+T is reserved by the browser (new tab), so we use Alt/Option
  // instead -- the only reliable shortcuts a page can actually receive.
  // Checking e.code (not e.key) sidesteps the special characters macOS
  // produces for Option+letter combos.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.altKey) return;
      if (e.code === "KeyT") {
        e.preventDefault();
        startAdding();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        setMoveDialogOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tasks, priorityGroups]);

  async function submitNewTask() {
    if (!newDescription.trim()) {
      setAdding(false);
      return;
    }
    await onAddTask(newDescription.trim());
    setNewDescription("");
    setAdding(false);
  }

  const unfinishedTasks = tasks.filter((t) => !t.status?.isComplete);

  async function moveTasks(moves: TaskMove[]) {
    await Promise.all(
      moves.map(({ taskId, date }) => onUpdateTask(taskId, { datePlanned: date })),
    );
  }

  return (
    <section className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Tasks</h2>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => onShowCompletedChange(e.target.checked)}
          />
          Show completed
        </label>
      </div>

      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={startAdding}
          className="flex w-fit items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-sm text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> New task
        </button>
        <button
          type="button"
          onClick={() => setMoveDialogOpen(true)}
          className="flex w-fit items-center gap-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeftRight size={16} /> Move unfinished
        </button>
      </div>

      <div className="flex-1 overflow-y-auto rounded border border-slate-200">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="w-10 px-1 py-1 text-center">Sta</th>
              <th className="w-10 px-1 py-1 text-center">PG</th>
              <th className="w-[44px] px-1 py-1 text-center">PR</th>
              <th className="w-20 px-1 py-1 text-center">PJ</th>
              <th className="px-2 py-1">Description</th>
              <th className="w-10 px-2 py-1 text-center">Note</th>
              <th className="w-8 px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-t border-slate-100">
                <td className="px-1 py-1" />
                <td className="px-1 py-1 text-center text-xs text-slate-400">
                  {priorityGroups.find((pg) => pg.id === newPriorityGroupId)?.prtyCode ?? "-"}
                </td>
                <td className="px-1 py-1 text-center text-xs text-slate-400">
                  {newPrtyOrdinal ?? "-"}
                </td>
                <td className="px-1 py-1" />
                <td className="px-2 py-1">
                  <input
                    autoFocus
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    onBlur={submitNewTask}
                    onKeyDown={(e) => e.key === "Enter" && submitNewTask()}
                    className="w-full rounded border border-slate-300 px-1 py-0.5"
                    placeholder="Task description"
                  />
                </td>
                <td />
                <td />
              </tr>
            )}
            {tasks.map((task) => (
              <tr key={task.id} className="border-t border-slate-100">
                <td className="px-1 py-1">
                  <select
                    value={task.statusId ?? NONE}
                    onChange={(e) => onUpdateTask(task.id, { statusId: e.target.value || null })}
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
                <td className="px-1 py-1">
                  <select
                    value={task.priorityGroupId ?? NONE}
                    onChange={(e) =>
                      onUpdateTask(task.id, { priorityGroupId: e.target.value || null })
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
                <td className="px-1 py-1">
                  <input
                    type="number"
                    defaultValue={task.prtyOrdinal ?? undefined}
                    onBlur={(e) =>
                      onUpdateTask(task.id, {
                        prtyOrdinal: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-slate-200 px-1 text-center"
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    value={task.projectId ?? NONE}
                    onChange={(e) => onUpdateTask(task.id, { projectId: e.target.value || null })}
                    title={task.project?.name ?? undefined}
                    className="w-full appearance-none rounded border border-slate-200 bg-white text-center text-xs"
                  >
                    <option value={NONE}>-</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  {editingDescriptionId === task.id && !isMobile ? (
                    <textarea
                      autoFocus
                      defaultValue={task.description}
                      rows={3}
                      onBlur={(e) => {
                        onUpdateTask(task.id, { description: e.target.value });
                        setEditingDescriptionId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-full rounded border border-slate-300 p-1 text-sm"
                    />
                  ) : (
                    <div className="group relative">
                      <div
                        onClick={() => setEditingDescriptionId(task.id)}
                        className="cursor-text truncate rounded border border-transparent px-1 py-1 hover:border-slate-200"
                      >
                        {task.description}
                      </div>
                      <div
                        role="tooltip"
                        className="pointer-events-none invisible absolute left-0 top-full z-20 mt-1 w-72 whitespace-pre-wrap rounded bg-slate-800 px-2 py-1.5 text-left text-xs normal-case text-slate-100 opacity-0 shadow-lg transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
                      >
                        {task.description}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-2 py-1 text-center">
                  {task.note && (
                    <span className="group relative inline-flex text-amber-500">
                      <StickyNote size={14} />
                      <div
                        role="tooltip"
                        className="pointer-events-none invisible absolute right-0 top-full z-20 mt-1 w-64 rounded bg-slate-800 px-2 py-1.5 text-left normal-case text-slate-100 opacity-0 shadow-lg transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
                      >
                        {task.note.noteText ? (
                          <div className="prose prose-invert prose-sm max-w-none [&>*]:my-0.5">
                            <Markdown>{task.note.noteText}</Markdown>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">No note text</span>
                        )}
                      </div>
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    aria-label="Delete task"
                    onClick={() => onDeleteTask(task.id)}
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

      {moveDialogOpen && (
        <MoveTasksDialog
          activeDate={activeDate}
          unfinishedTasks={unfinishedTasks}
          onMove={moveTasks}
          onClose={() => setMoveDialogOpen(false)}
        />
      )}

      {isMobile &&
        (() => {
          const editingTask = tasks.find((t) => t.id === editingDescriptionId);
          if (!editingTask) return null;
          return (
            <MobileTextEditor
              title="Edit Description"
              initialValue={editingTask.description}
              onSave={(description) => {
                onUpdateTask(editingTask.id, { description });
                setEditingDescriptionId(null);
              }}
            />
          );
        })()}
    </section>
  );
}
