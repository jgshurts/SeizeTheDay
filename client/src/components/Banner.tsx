import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, LogOut, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { addDays, formatWeekday, toLocalDateKey } from "../lib/date";
import { readableTextColor } from "../lib/color";
import { ProjectFilterDialog } from "./ProjectFilterDialog";
import type { Project } from "../types";

interface BannerProps {
  activeDate: string;
  onDateChange: (date: string) => void;
  onOpenSettings: () => void;
  showSchedule: boolean;
  onShowScheduleChange: (show: boolean) => void;
  projects: Project[];
  contextProjectIds: string[];
  onContextProjectIdsChange: (projectIds: string[]) => void;
  compact?: boolean;
}

export function Banner({
  activeDate,
  onDateChange,
  onOpenSettings,
  showSchedule,
  onShowScheduleChange,
  projects,
  contextProjectIds,
  onContextProjectIdsChange,
  compact = false,
}: BannerProps) {
  const { user, logout } = useAuth();
  const bannerColor = user?.themeBannerColor;
  const [projectFilterOpen, setProjectFilterOpen] = useState(false);
  const selectedProjects = projects.filter((p) => contextProjectIds.includes(p.id));
  // Only a single selected project can lend the button its color; several
  // at once fall back to the same amber as a single uncolored project.
  const contextProjectColor =
    selectedProjects.length === 1 ? selectedProjects[0].color : null;
  const projectFilterLabel =
    contextProjectIds.length === 0
      ? "All Projects"
      : selectedProjects.length === 1
        ? selectedProjects[0].name
        : `${contextProjectIds.length} Projects`;
  const isToday = activeDate === toLocalDateKey(new Date());

  return (
    <header
      className={`flex flex-wrap items-center justify-between ${
        bannerColor ? "border-b border-black/15" : "border-b border-emerald-800 bg-emerald-600"
      } ${compact ? "gap-y-1 px-2 py-2" : "px-6 py-3"}`}
      style={bannerColor ? { backgroundColor: bannerColor } : undefined}
    >
      {!compact && <h1 className="text-lg font-semibold text-white">Seize the Day</h1>}

      <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
        <span
          className={`font-medium text-white/90 ${compact ? "w-8 text-xs" : "w-20 text-sm"}`}
        >
          {formatWeekday(activeDate, compact)}
        </span>

        <button
          type="button"
          aria-label="Previous day"
          onClick={() => onDateChange(addDays(activeDate, -1))}
          className={`rounded border border-white/40 bg-white/10 text-white hover:bg-white/25 ${compact ? "p-0.5" : "p-1"}`}
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
          className={`rounded border border-white/40 bg-white/10 text-white hover:bg-white/25 ${compact ? "p-0.5" : "p-1"}`}
        >
          <ChevronRight size={compact ? 16 : 20} />
        </button>

        <button
          type="button"
          onClick={() => onDateChange(toLocalDateKey(new Date()))}
          title={isToday ? undefined : "Not viewing today — jump back"}
          className={`rounded border font-medium ${
            isToday
              ? "border-white/40 bg-white/10 text-white hover:bg-white/25"
              : "border-amber-500 bg-amber-300 text-amber-950 shadow-sm hover:bg-amber-200"
          } ${
            compact ? "px-1 py-0.5 text-xs" : "px-2 py-1 text-sm"
          }`}
        >
          Today
        </button>

        <button
          type="button"
          aria-label="Filter projects"
          title={selectedProjects.map((p) => p.name).join(", ") || "All Projects"}
          onClick={() => setProjectFilterOpen(true)}
          className={`flex items-center gap-1 rounded border text-sm ${compact ? "max-w-[90px] px-1 py-0.5" : "ml-2 px-2 py-1"} ${
            contextProjectIds.length > 0
              ? contextProjectColor
                ? "font-medium"
                : "border-amber-400 bg-amber-100 font-medium text-amber-800"
              : "border-emerald-800 bg-white text-slate-700"
          }`}
          style={
            contextProjectColor
              ? {
                  backgroundColor: contextProjectColor,
                  borderColor: contextProjectColor,
                  color: readableTextColor(contextProjectColor),
                }
              : undefined
          }
        >
          <span className="truncate">{projectFilterLabel}</span>
          <ChevronDown size={14} className="shrink-0" />
        </button>
      </div>

      <div className={`flex items-center ${compact ? "gap-1" : "gap-3"}`}>
        <button
          type="button"
          aria-label={showSchedule ? "Hide schedule" : "Show schedule"}
          title={showSchedule ? "Hide schedule" : "Show schedule"}
          aria-pressed={showSchedule}
          onClick={() => onShowScheduleChange(!showSchedule)}
          className={`rounded text-white hover:bg-emerald-700 ${compact ? "p-0.5" : "p-1"} ${
            showSchedule ? "bg-white/20" : ""
          }`}
        >
          <CalendarClock size={compact ? 16 : 18} />
        </button>
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
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

      {projectFilterOpen && (
        <ProjectFilterDialog
          projects={projects}
          selectedIds={contextProjectIds}
          onApply={onContextProjectIdsChange}
          onClose={() => setProjectFilterOpen(false)}
        />
      )}
    </header>
  );
}
