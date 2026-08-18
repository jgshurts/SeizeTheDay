import { useEffect, useState } from "react";
import { Banner } from "../components/Banner";
import { TasksColumn } from "../components/TasksColumn";
import { NotesColumn } from "../components/NotesColumn";
import { SettingsDialog } from "../components/settings/SettingsDialog";
import { toDateKey } from "../lib/date";
import { computeDefaultTaskPriority } from "../lib/taskDefaults";
import { api } from "../lib/api";
import type { PriorityGroup, Project, Status, Task } from "../types";

export function MainPage() {
  const [activeDate, setActiveDate] = useState(() => toDateKey(new Date()));
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorityGroups, setPriorityGroups] = useState<PriorityGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [contextProjectId, setContextProjectId] = useState<string | null>(null);

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
    setTasks((prev) => [...prev, task]);
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
      return prev.map((t) => (t.id === id ? updated : t));
    });
  }

  async function deleteTask(id: string) {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Banner
        activeDate={activeDate}
        onDateChange={setActiveDate}
        onOpenSettings={() => setSettingsOpen(true)}
        projects={projects}
        contextProjectId={contextProjectId}
        onContextProjectChange={setContextProjectId}
      />

      <main className="flex flex-1 gap-4 overflow-hidden p-4">
        <div className="w-1/2 overflow-hidden">
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
        </div>
        <div className="w-1/2 overflow-hidden">
          <NotesColumn
            activeDate={activeDate}
            projects={projects}
            contextProjectId={contextProjectId}
            onAddRelatedTask={addTask}
          />
        </div>
      </main>

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
