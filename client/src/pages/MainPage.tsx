import { useEffect, useRef, useState } from "react";
import { Banner } from "../components/Banner";
import { TasksColumn } from "../components/TasksColumn";
import { NotesColumn } from "../components/NotesColumn";
import { SettingsDialog } from "../components/settings/SettingsDialog";
import { toDateKey } from "../lib/date";
import { computeDefaultTaskPriority } from "../lib/taskDefaults";
import { sortTasks } from "../lib/taskSort";
import { useIsMobile } from "../lib/useIsMobile";
import { api } from "../lib/api";
import type { PriorityGroup, Project, Status, Task } from "../types";

const SPLIT_STORAGE_KEY = "std_task_column_width";
const DEFAULT_SPLIT = 50;
const MIN_SPLIT = 20;
const MAX_SPLIT = 80;

function loadStoredSplit(): number {
  const stored = Number(localStorage.getItem(SPLIT_STORAGE_KEY));
  if (!Number.isFinite(stored)) return DEFAULT_SPLIT;
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, stored));
}

export function MainPage() {
  const [activeDate, setActiveDate] = useState(() => toDateKey(new Date()));
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorityGroups, setPriorityGroups] = useState<PriorityGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [contextProjectId, setContextProjectId] = useState<string | null>(null);

  const [taskColumnWidth, setTaskColumnWidth] = useState(loadStoredSplit);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLElement>(null);

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"tasks" | "notes">("tasks");

  useEffect(() => {
    api.get<Status[]>("/statuses").then(setStatuses);
    api.get<PriorityGroup[]>("/priority-groups").then(setPriorityGroups);
    api.get<Project[]>("/projects").then(setProjects);
  }, []);

  useEffect(() => {
    const projectParam = contextProjectId ? `&projectId=${contextProjectId}` : "";
    api
      .get<Task[]>(`/tasks?date=${activeDate}&includeCompleted=${showCompleted}${projectParam}`)
      .then(setTasks);
  }, [activeDate, showCompleted, contextProjectId]);

  // Dragging the Tasks/Notes divider. Position is derived straight from the
  // mouse event rather than component state, so there's no stale-closure risk
  // even though this listener is only attached once per drag.
  useEffect(() => {
    if (!isDraggingSplit) return;

    function handleMouseMove(e: MouseEvent) {
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, percent));
      setTaskColumnWidth(clamped);
      localStorage.setItem(SPLIT_STORAGE_KEY, String(clamped));
    }

    function handleMouseUp() {
      setIsDraggingSplit(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSplit]);

  async function addTask(description: string, opts?: { noteId?: string }) {
    const { priorityGroupId, prtyOrdinal } = computeDefaultTaskPriority(tasks, priorityGroups);
    const task = await api.post<Task>("/tasks", {
      description,
      datePlanned: activeDate,
      priorityGroupId,
      prtyOrdinal,
      noteId: opts?.noteId ?? null,
      projectId: contextProjectId,
    });
    setTasks((prev) => sortTasks([...prev, task]));
    return task;
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const updated = await api.patch<Task>(`/tasks/${id}`, patch);
    setTasks((prev) => {
      // If this edit moved the task off the day currently being viewed
      // (e.g. forwarding it to another date), drop it instead of leaving a
      // stale entry that no longer belongs in this list.
      if (updated.datePlanned.slice(0, 10) !== activeDate) {
        return prev.filter((t) => t.id !== id);
      }
      // Re-sort immediately so editing Sta/PG/PR visibly reorders the grid
      // instead of waiting for the next fetch to catch up.
      return sortTasks(prev.map((t) => (t.id === id ? updated : t)));
    });
  }

  async function deleteTask(id: string) {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const tasksColumn = (
    <TasksColumn
      activeDate={activeDate}
      tasks={tasks}
      statuses={statuses}
      priorityGroups={priorityGroups}
      projects={projects}
      showCompleted={showCompleted}
      onShowCompletedChange={setShowCompleted}
      onAddTask={(description) => addTask(description)}
      onUpdateTask={updateTask}
      onDeleteTask={deleteTask}
    />
  );

  const notesColumn = (
    <NotesColumn
      activeDate={activeDate}
      projects={projects}
      contextProjectId={contextProjectId}
      onAddRelatedTask={addTask}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-slate-50">
      <Banner
        activeDate={activeDate}
        onDateChange={setActiveDate}
        onOpenSettings={() => setSettingsOpen(true)}
        projects={projects}
        contextProjectId={contextProjectId}
        onContextProjectChange={setContextProjectId}
        compact={isMobile}
      />

      {isMobile ? (
        <>
          <div className="flex border-b border-slate-200 bg-white">
            {(["tasks", "notes"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={`flex-1 py-2 text-sm font-medium capitalize ${
                  mobileTab === tab
                    ? "border-b-2 border-indigo-600 text-indigo-700"
                    : "text-slate-500"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <main className="min-h-0 flex-1 overflow-hidden p-3">
            {mobileTab === "tasks" ? tasksColumn : notesColumn}
          </main>
        </>
      ) : (
        <main
          ref={splitContainerRef}
          className={`flex min-h-0 flex-1 overflow-hidden p-4 ${isDraggingSplit ? "select-none" : ""}`}
        >
          <div style={{ width: `${taskColumnWidth}%` }} className="min-h-0 overflow-hidden pr-2">
            {tasksColumn}
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Tasks and Notes columns"
            onMouseDown={() => setIsDraggingSplit(true)}
            className="w-1 shrink-0 cursor-col-resize self-stretch rounded bg-slate-200 hover:bg-indigo-300 active:bg-indigo-400"
          />

          <div
            style={{ width: `${100 - taskColumnWidth}%` }}
            className="min-h-0 overflow-hidden pl-2"
          >
            {notesColumn}
          </div>
        </main>
      )}

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
