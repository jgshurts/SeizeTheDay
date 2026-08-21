import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { ArrowLeftRight, Plus, StickyNote, Trash2 } from "lucide-react";
import { computeDefaultTaskPriority } from "../lib/taskDefaults";
import { useIsMobile } from "../lib/useIsMobile";
import { formatDisplay } from "../lib/date";
import { MoveTasksDialog } from "./MoveTasksDialog";
import type { TaskMove } from "./MoveTasksDialog";
import { MobileTextEditor } from "./MobileTextEditor";
import { TaskActionsMenu } from "./TaskActionsMenu";
import { StatusSelect } from "./StatusSelect";
import { MoveTaskDateDialog } from "./MoveTaskDateDialog";
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
  const [moveDialogTarget, setMoveDialogTarget] = useState<"unfinished" | "selected" | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [openActionsMenuId, setOpenActionsMenuId] = useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Selection is scoped to whatever's currently on screen -- clear it when
  // the day changes so it can't silently apply to a different date's tasks.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeDate]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < tasks.length;
    }
  }, [selectedIds, tasks.length]);

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
        setMoveDialogTarget("unfinished");
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
  const selectedTasks = tasks.filter((t) => selectedIds.has(t.id));

  async function moveTasks(moves: TaskMove[]) {
    await Promise.all(
      moves.map(({ taskId, date }) => onUpdateTask(taskId, { datePlanned: date })),
    );
  }

  async function bulkDelete() {
    await Promise.all(selectedTasks.map((t) => onDeleteTask(t.id)));
    setSelectedIds(new Set());
  }

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

  return (
    <section className="flex h-full min-h-0 flex-col">
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
          onClick={() => setMoveDialogTarget("unfinished")}
          className="flex w-fit items-center gap-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeftRight size={16} /> Move unfinished
        </button>
      </div>

      {!isMobile && selectedIds.size > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-sm text-indigo-800">
          <span>
            {selectedIds.size} task{selectedIds.size === 1 ? "" : "s"} selected
          </span>
          <TaskActionsMenu
            open={bulkMenuOpen}
            onToggle={() => setBulkMenuOpen((prev) => !prev)}
            onClose={() => setBulkMenuOpen(false)}
            onMoveToDate={() => setMoveDialogTarget("selected")}
            onDelete={bulkDelete}
          />
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-indigo-500 hover:text-indigo-700"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded border border-slate-200">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
            <tr>
              {!isMobile && (
                <th className="w-6 px-1 py-1 text-center">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    aria-label="Select all tasks"
                    checked={tasks.length > 0 && selectedIds.size === tasks.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th className="w-10 px-1 py-1 text-center">Sta</th>
              <th className="w-10 px-1 py-1 text-center">PG</th>
              <th className="w-[44px] px-1 py-1 text-center">PR</th>
              {!isMobile && <th className="w-20 px-1 py-1 text-center">PJ</th>}
              <th className="px-2 py-1">Description</th>
              {!isMobile && <th className="w-10 px-2 py-1 text-center">Note</th>}
              <th className="w-8 px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="border-t border-slate-100">
                {!isMobile && <td className="px-1 py-1" />}
                <td className="px-1 py-1" />
                <td className="px-1 py-1 text-center text-xs text-slate-400">
                  {priorityGroups.find((pg) => pg.id === newPriorityGroupId)?.prtyCode ?? "-"}
                </td>
                <td className="px-1 py-1 text-center text-xs text-slate-400">
                  {newPrtyOrdinal ?? "-"}
                </td>
                {!isMobile && <td className="px-1 py-1" />}
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
                {!isMobile && <td />}
                <td />
              </tr>
            )}
            {tasks.map((task) => (
              <tr key={task.id} className="border-t border-slate-100">
                {!isMobile && (
                  <td className="px-1 py-1 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${task.description}`}
                      checked={selectedIds.has(task.id)}
                      onChange={() => toggleSelect(task.id)}
                    />
                  </td>
                )}
                <td className="px-1 py-1">
                  <StatusSelect
                    statuses={statuses}
                    value={task.statusId}
                    onChange={(statusId) => onUpdateTask(task.id, { statusId })}
                  />
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    defaultValue={task.prtyOrdinal ?? undefined}
                    onChange={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "");
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                      e.preventDefault();
                      const current = Number(e.currentTarget.value) || 0;
                      const next = e.key === "ArrowUp" ? current + 1 : Math.max(0, current - 1);
                      e.currentTarget.value = String(next);
                      onUpdateTask(task.id, { prtyOrdinal: next });
                    }}
                    onBlur={(e) =>
                      onUpdateTask(task.id, {
                        prtyOrdinal: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-slate-200 px-1 text-center"
                  />
                </td>
                {!isMobile && (
                  <td className="px-1 py-1">
                    <select
                      value={task.projectId ?? NONE}
                      onChange={(e) =>
                        onUpdateTask(task.id, { projectId: e.target.value || null })
                      }
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
                )}
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
                      {!isMobile && (
                        <div
                          role="tooltip"
                          className="pointer-events-none invisible absolute left-0 top-full z-20 mt-1 w-72 whitespace-pre-wrap rounded bg-slate-800 px-2 py-1.5 text-left text-xs normal-case text-slate-100 opacity-0 shadow-lg transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
                        >
                          {task.description}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                {!isMobile && (
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
                )}
                <td className="px-2 py-1 text-right">
                  {isMobile ? (
                    <button
                      type="button"
                      aria-label="Delete task"
                      onClick={() => onDeleteTask(task.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <TaskActionsMenu
                      open={openActionsMenuId === task.id}
                      onToggle={() =>
                        setOpenActionsMenuId((prev) => (prev === task.id ? null : task.id))
                      }
                      onClose={() => setOpenActionsMenuId(null)}
                      onMoveToDate={() => setMovingTaskId(task.id)}
                      onDelete={() => onDeleteTask(task.id)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {moveDialogTarget && (
        <MoveTasksDialog
          title={moveDialogTarget === "unfinished" ? "Move Unfinished Tasks" : "Move Selected Tasks"}
          emptyMessage={
            moveDialogTarget === "unfinished"
              ? `No unfinished tasks on ${formatDisplay(activeDate)}.`
              : "No tasks selected."
          }
          activeDate={activeDate}
          tasks={moveDialogTarget === "unfinished" ? unfinishedTasks : selectedTasks}
          onMove={async (moves) => {
            await moveTasks(moves);
            if (moveDialogTarget === "selected") setSelectedIds(new Set());
          }}
          onClose={() => setMoveDialogTarget(null)}
        />
      )}

      {(() => {
        const movingTask = tasks.find((t) => t.id === movingTaskId);
        if (!movingTask) return null;
        return (
          <MoveTaskDateDialog
            taskDescription={movingTask.description}
            currentDate={movingTask.datePlanned.slice(0, 10)}
            onMove={(date) => onUpdateTask(movingTask.id, { datePlanned: date })}
            onClose={() => setMovingTaskId(null)}
          />
        );
      })()}

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
              projects={projects}
              projectId={editingTask.projectId}
              onProjectChange={(projectId) => onUpdateTask(editingTask.id, { projectId })}
            />
          );
        })()}
    </section>
  );
}
