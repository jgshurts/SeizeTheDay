import { useState } from "react";
import { Banner } from "../components/Banner";
import { TasksColumn } from "../components/TasksColumn";
import { NotesColumn } from "../components/NotesColumn";
import { SettingsDialog } from "../components/settings/SettingsDialog";
import { toDateKey } from "../lib/date";

export function MainPage() {
  const [activeDate, setActiveDate] = useState(() => toDateKey(new Date()));
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Banner
        activeDate={activeDate}
        onDateChange={setActiveDate}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex flex-1 gap-4 overflow-hidden p-4">
        <div className="w-[35%] overflow-hidden">
          <TasksColumn activeDate={activeDate} />
        </div>
        <div className="w-[65%] overflow-hidden">
          <NotesColumn />
        </div>
      </main>

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
