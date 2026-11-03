import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "./Modal";
import { addDays, formatDisplay, toLocalDateKey } from "../lib/date";

// The phone header's date and project controls, moved out of the Banner so
// it fits on one line: previous/next day, a date picker, Today, and the
// project filter (which opens its own dialog on top).
export function DateFilterDialog({
  activeDate,
  onDateChange,
  projectFilterLabel,
  projectFilterActive,
  onOpenProjectFilter,
  onClose,
}: {
  activeDate: string;
  onDateChange: (date: string) => void;
  projectFilterLabel: string;
  projectFilterActive: boolean;
  onOpenProjectFilter: () => void;
  onClose: () => void;
}) {
  const isToday = activeDate === toLocalDateKey(new Date());

  return (
    <Modal title="Date & Projects" onClose={onClose} maxWidthClassName="max-w-sm">
      <div className="space-y-4">
        <div className="text-center text-sm font-medium text-slate-700">{formatDisplay(activeDate)}</div>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => onDateChange(addDays(activeDate, -1))}
            className="rounded border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft size={20} />
          </button>
          <input
            type="date"
            value={activeDate}
            onChange={(e) => {
              if (!e.target.value) return;
              onDateChange(e.target.value);
              onClose();
            }}
            aria-label="Pick a date"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
          />
          <button
            type="button"
            aria-label="Next day"
            onClick={() => onDateChange(addDays(activeDate, 1))}
            className="rounded border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <button
          type="button"
          disabled={isToday}
          onClick={() => {
            onDateChange(toLocalDateKey(new Date()));
            onClose();
          }}
          className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Today
        </button>

        <button
          type="button"
          onClick={onOpenProjectFilter}
          className={`flex w-full items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm ${
            projectFilterActive
              ? "border-amber-400 bg-amber-100 font-medium text-amber-800"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span className="truncate">{projectFilterLabel}</span>
          <ChevronDown size={14} className="shrink-0" />
        </button>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
