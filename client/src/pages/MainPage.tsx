import { useEffect, useState } from "react";
import { Banner } from "../components/Banner";
import { TasksColumn } from "../components/TasksColumn";
import { NotesColumn } from "../components/NotesColumn";
import { SettingsDialog } from "../components/settings/SettingsDialog";
import { toDateKey } from "../lib/date";
import { computeDefaultTaskPriority } from "../lib/taskDefaults";
import { api } from "../lib/api";
import type { PriorityGroup, Status, Task } from "../types";

export function MainPage() {
  const [activeDate, setActiveDate] = useState(() => toDateKey(new Date()));
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorityGroups, setPriorityGroups] = useState<PriorityGroup[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    api.get<Status[]>("/statuses").then(setStatuses);
    api.get<PriorityGroup[]>("/priority-groups").then(setPriorityGroups);
  }, []);

  useEffect(() => {
    api
      .get<Task[]>(`/tasks?date=${activeDate}&includeCompleted=${showCompleted}`)
      .then(setTasks);
  }, [activeDate, showCompleted]);

  async function addTask(description: string, opts?: { noteId?: string }) {
    const { priorityGroupId, prtyOrdinal } = computeDefaultTaskPriority(tasks, priorityGroups);
    const task = await api.post<Task>("/tasks", {
      description,
      datePlanned: activeDate,
      priorityGroupId,
      prtyOrdinal,
      noteId: opts?.noteId ?? null,
    });
    setTasks((prev) => [...prev, task]);
    return task;
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
    <div className="flex h-screen flex-col bg-slate-50">
      <Banner
        activeDate={activeDate}
        onDateChange={setActiveDate}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex flex-1 gap-4 overflow-hidden p-4">
        <div className="w-1/2 overflow-hidden">
          <TasksColumn
            tasks={tasks}
            statuses={statuses}
            priorityGroups={priorityGroups}
            showCompleted={showCompleted}
            onShowCompletedChange={setShowCompleted}
            onAddTask={(description) => addTask(description)}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        </div>
        <div className="w-1/2 overflow-hidden">
          <NotesColumn activeDate={activeDate} onAddRelatedTask={addTask} />
        </div>
      </main>

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
