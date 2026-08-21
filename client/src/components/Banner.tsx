import { ChevronLeft, ChevronRight, LogOut, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { addDays } from "../lib/date";
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
    <header
      className={`flex flex-wrap items-center justify-between border-b border-emerald-800 bg-emerald-600 ${
        compact ? "gap-y-1 px-2 py-2" : "px-6 py-3"
      }`}
    >
      {!compact && <h1 className="text-lg font-semibold text-white">Seize the Day</h1>}

      <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => onDateChange(addDays(activeDate, -1))}
          className={`rounded text-white hover:bg-emerald-700 ${compact ? "p-0.5" : "p-1"}`}
        >
          <ChevronLeft size={compact ? 16 : 20} />
        </button>

        <input
          type="date"
          value={activeDate}
          onChange={(e) => onDateChange(e.target.value)}
          className={`rounded border border-emerald-800 bg-white text-sm text-slate-800 ${compact ? "px-1 py-0.5" : "px-2 py-1"}`}
        />

        <button
          type="button"
          aria-label="Next day"
          onClick={() => onDateChange(addDays(activeDate, 1))}
          className={`rounded text-white hover:bg-emerald-700 ${compact ? "p-0.5" : "p-1"}`}
        >
          <ChevronRight size={compact ? 16 : 20} />
        </button>

        <select
          aria-label="Context project"
          value={contextProjectId ?? NONE}
          onChange={(e) => onContextProjectChange(e.target.value || null)}
          className={`rounded border text-sm ${compact ? "max-w-[90px] px-1 py-0.5" : "ml-2 px-2 py-1"} ${
            contextProjectId
              ? "border-amber-400 bg-amber-100 font-medium text-amber-800"
              : "border-emerald-800 bg-white text-slate-700"
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

      <div className={`flex items-center ${compact ? "gap-1" : "gap-3"}`}>
        <button
          type="button"
          aria-label="Settings"
          onClick={onOpenSettings}
          className={`rounded text-white hover:bg-emerald-700 ${compact ? "p-0.5" : "p-1"}`}
        >
          <Settings size={compact ? 16 : 18} />
        </button>
        <span
          className={`rounded-full bg-white/20 font-medium text-white ${
            compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
          }`}
        >
          {user?.nickname}
        </span>
        <button
          type="button"
          aria-label="Log out"
          onClick={logout}
          className={`rounded text-white hover:bg-emerald-700 ${compact ? "p-0.5" : "p-1"}`}
        >
          <LogOut size={compact ? 16 : 18} />
        </button>
      </div>
    </header>
  );
}
