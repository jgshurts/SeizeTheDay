import { ChevronLeft, ChevronRight, LogOut, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { addDays, formatDisplay } from "../lib/date";
import type { Project } from "../types";

const NONE = "";

interface BannerProps {
  activeDate: string;
  onDateChange: (date: string) => void;
  onOpenSettings: () => void;
  projects: Project[];
  contextProjectId: string | null;
  onContextProjectChange: (projectId: string | null) => void;
  compact?: boolean;
}

export function Banner({
  activeDate,
  onDateChange,
  onOpenSettings,
  projects,
  contextProjectId,
  onContextProjectChange,
  compact = false,
}: BannerProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      {!compact && <h1 className="text-lg font-semibold text-slate-800">Seize the Day</h1>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => onDateChange(addDays(activeDate, -1))}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft size={20} />
        </button>

        <input
          type="date"
          value={activeDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <span className="hidden text-sm text-slate-500 sm:inline">{formatDisplay(activeDate)}</span>

        <button
          type="button"
          aria-label="Next day"
          onClick={() => onDateChange(addDays(activeDate, 1))}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight size={20} />
        </button>

        <select
          aria-label="Context project"
          value={contextProjectId ?? NONE}
          onChange={(e) => onContextProjectChange(e.target.value || null)}
          className={`ml-2 rounded border px-2 py-1 text-sm ${
            contextProjectId
              ? "border-amber-400 bg-amber-100 font-medium text-amber-800"
              : "border-slate-300 bg-white text-slate-700"
          }`}
        >
          <option value={NONE}>All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Settings"
          onClick={onOpenSettings}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <Settings size={18} />
        </button>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
          {user?.nickname}
        </span>
        <button
          type="button"
          aria-label="Log out"
          onClick={logout}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
