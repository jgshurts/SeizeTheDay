import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Banner } from "../components/Banner";
import { CompletedTasksReport } from "../components/CompletedTasksReport";
import { TasksColumn } from "../components/TasksColumn";
import { NotesColumn } from "../components/NotesColumn";
import { ScheduleColumn } from "../components/ScheduleColumn";
import { SettingsDialog } from "../components/settings/SettingsDialog";
import { toLocalDateKey } from "../lib/date";
import { computeDefaultTaskPriority } from "../lib/taskDefaults";
import { sortTasks } from "../lib/taskSort";
import { useIsMobile } from "../lib/useIsMobile";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { withAlpha } from "../lib/color";
import type { PriorityGroup, Project, Status, Task } from "../types";

// Fades a panel's background image out under a translucent white veil so
// text stays readable on top of it, in one background-image declaration
// instead of a separate overlay element.
function panelBackgroundStyle(imageUrl: string | null | undefined): CSSProperties {
  if (!imageUrl) return {};
  return {
    backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.85), rgba(248, 250, 252, 0.85)), url(${imageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

const SPLIT_STORAGE_KEY = "std_task_column_width";
const DEFAULT_SPLIT = 50;
const MIN_SPLIT = 20;
const MAX_SPLIT = 80;

function loadStoredSplit(): number {
  const raw = localStorage.getItem(SPLIT_STORAGE_KEY);
  if (raw === null) return DEFAULT_SPLIT;
  const stored = Number(raw);
  if (!Number.isFinite(stored)) return DEFAULT_SPLIT;
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, stored));
}

const CONTEXT_PROJECT_STORAGE_KEY = "std_context_project_id";

function loadStoredContextProjectId(): string | null {
  return localStorage.getItem(CONTEXT_PROJECT_STORAGE_KEY);
}

const SHOW_SCHEDULE_STORAGE_KEY = "std_show_schedule";

function loadStoredShowSchedule(): boolean {
  return localStorage.getItem(SHOW_SCHEDULE_STORAGE_KEY) !== "false";
}

export function MainPage() {
  const { user } = useAuth();
  const [activeDate, setActiveDate] = useState(() => toLocalDateKey(new Date()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completedTasksOpen, setCompletedTasksOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorityGroups, setPriorityGroups] = useState<PriorityGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [contextProjectId, setContextProjectId] = useState(loadStoredContextProjectId);
  const [showSchedule, setShowSchedule] = useState(loadStoredShowSchedule);

  const [taskColumnWidth, setTaskColumnWidth] = useState(loadStoredSplit);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLElement>(null);

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"tasks" | "schedule" | "notes">("tasks");
  // Hiding Schedule while its mobile tab is active would otherwise leave the
  // user stranded on a tab with nothing to show -- derived at render instead
  // of corrected in an effect, so there's no extra render in between.
  const effectiveMobileTab = mobileTab === "schedule" && !showSchedule ? "tasks" : mobileTab;

  useEffect(() => {
    api.get<Status[]>("/statuses").then(setStatuses);
    api.get<PriorityGroup[]>("/priority-groups").then(setPriorityGroups);
    api.get<Project[]>("/projects").then(setProjects);
  }, []);

  // Persisted so the Banner's project filter survives a refresh, the same
  // way the Tasks/Notes split width already does.
  useEffect(() => {
    if (contextProjectId) {
      localStorage.setItem(CONTEXT_PROJECT_STORAGE_KEY, contextProjectId);
    } else {
      localStorage.removeItem(CONTEXT_PROJECT_STORAGE_KEY);
    }
  }, [contextProjectId]);

  useEffect(() => {
    localStorage.setItem(SHOW_SCHEDULE_STORAGE_KEY, String(showSchedule));
  }, [showSchedule]);

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

  async function addTask(description: string, opts?: { projectId?: string | null }) {
    const { priorityGroupId, prtyOrdinal } = computeDefaultTaskPriority(tasks, priorityGroups);
    const task = await api.post<Task>("/tasks", {
      description,
      datePlanned: activeDate,
      priorityGroupId,
      prtyOrdinal,
      projectId: opts?.projectId !== undefined ? opts.projectId : contextProjectId,
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
      onAddTask={(description, projectId) => addTask(description, { projectId })}
      onUpdateTask={updateTask}
      onDeleteTask={deleteTask}
      subBannerColor={user?.themeSubBannerColor}
    />
  );

  const scheduleColumn = (
    <ScheduleColumn
      activeDate={activeDate}
      projects={projects}
      subBannerColor={user?.themeSubBannerColor}
    />
  );

  // The Tasks/Notes split stays user-resizable (see taskColumnWidth above);
  // Schedule is carved out of the Tasks side at a fixed 70/30 ratio rather
  // than adding a second draggable divider -- meeting titles are short, so
  // Schedule doesn't need as much width as the Tasks grid does. Toggled off
  // entirely, Tasks reclaims the full width.
  const tasksAndSchedule = showSchedule ? (
    <div className="flex h-full min-h-0 gap-2">
      <div className="min-h-0 w-[70%] overflow-hidden">{tasksColumn}</div>
      <div className="min-h-0 w-[30%] overflow-hidden border-l border-slate-200 pl-2">
        {scheduleColumn}
      </div>
    </div>
  ) : (
    tasksColumn
  );

  const notesColumn = (
    <NotesColumn
      activeDate={activeDate}
      projects={projects}
      contextProjectId={contextProjectId}
      subBannerColor={user?.themeSubBannerColor}
    />
  );

  // Selecting a project in the Banner tints the whole app with that
  // project's color, taking over from the user's theme background color
  // while it's active -- a strong visual cue for which project is in focus.
  const contextProjectColor = projects.find((p) => p.id === contextProjectId)?.color;
  const backgroundColor = contextProjectColor
    ? withAlpha(contextProjectColor, "33")
    : user?.themeBackgroundColor;

  return (
    <div
      className="flex h-dvh flex-col bg-slate-50"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <Banner
        activeDate={activeDate}
        onDateChange={setActiveDate}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCompletedTasks={() => setCompletedTasksOpen(true)}
        showSchedule={showSchedule}
        onShowScheduleChange={setShowSchedule}
        projects={projects}
        contextProjectId={contextProjectId}
        onContextProjectChange={setContextProjectId}
        compact={isMobile}
      />

      {isMobile ? (
        <>
          <div className="flex border-b border-slate-200 bg-white">
            {(["tasks", "schedule", "notes"] as const)
              .filter((tab) => tab !== "schedule" || showSchedule)
              .map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={`flex-1 py-2 text-sm font-medium capitalize ${
                  effectiveMobileTab === tab
                    ? "border-b-2 border-indigo-600 text-indigo-700"
                    : "text-slate-500"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <main
            className="min-h-0 flex-1 overflow-hidden p-3"
            style={panelBackgroundStyle(
              effectiveMobileTab === "notes" ? user?.themeRightImage : user?.themeLeftImage,
            )}
          >
            {effectiveMobileTab === "tasks" && tasksColumn}
            {effectiveMobileTab === "schedule" && scheduleColumn}
            {effectiveMobileTab === "notes" && notesColumn}
          </main>
        </>
      ) : (
        <main
          ref={splitContainerRef}
          className={`flex min-h-0 flex-1 overflow-hidden p-4 ${isDraggingSplit ? "select-none" : ""}`}
        >
          <div
            style={{ width: `${taskColumnWidth}%`, ...panelBackgroundStyle(user?.themeLeftImage) }}
            className="min-h-0 overflow-hidden pr-2"
          >
            {tasksAndSchedule}
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Tasks and Notes columns"
            onMouseDown={() => setIsDraggingSplit(true)}
            className="w-1 shrink-0 cursor-col-resize self-stretch rounded bg-slate-200 hover:bg-indigo-300 active:bg-indigo-400"
          />

          <div
            style={{
              width: `${100 - taskColumnWidth}%`,
              ...panelBackgroundStyle(user?.themeRightImage),
            }}
            className="min-h-0 overflow-hidden pl-2"
          >
            {notesColumn}
          </div>
        </main>
      )}

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {completedTasksOpen && (
        <CompletedTasksReport projects={projects} onClose={() => setCompletedTasksOpen(false)} />
      )}
    </div>
  );
}
