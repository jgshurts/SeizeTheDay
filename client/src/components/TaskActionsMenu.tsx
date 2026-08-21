import { useEffect, useRef } from "react";
import { CalendarClock, Menu, Trash2 } from "lucide-react";

interface TaskActionsMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMoveToDate: () => void;
  onDelete: () => void;
}

// A single row-actions entry point rather than scattering more icon buttons
// across an already-tight row -- room to grow as more per-task actions show
// up (this is the first: "Move to date").
export function TaskActionsMenu({
  open,
  onToggle,
  onClose,
  onMoveToDate,
  onDelete,
}: TaskActionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label="Task actions"
        onClick={onToggle}
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <Menu size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              onMoveToDate();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100"
          >
            <CalendarClock size={14} /> Move to date...
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
