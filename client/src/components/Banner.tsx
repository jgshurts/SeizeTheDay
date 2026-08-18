import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { addDays, formatDisplay } from "../lib/date";

interface BannerProps {
  activeDate: string;
  onDateChange: (date: string) => void;
}

export function Banner({ activeDate, onDateChange }: BannerProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <h1 className="text-lg font-semibold text-slate-800">Sieze the Day</h1>

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
      </div>

      <div className="flex items-center gap-3">
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
