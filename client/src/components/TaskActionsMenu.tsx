import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarClock, MoreVertical, Trash2 } from "lucide-react";

interface TaskActionsMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMoveToDate: () => void;
  onMoveToTomorrow: () => void;
  onDelete: () => void;
  // Set when this row is part of a larger checked selection, so its own
  // menu acts on the whole selection instead of just this row -- the count
  // is shown on each action so that isn't a surprise.
  selectionCount?: number;
}

// A single row-actions entry point rather than scattering more icon buttons
// across an already-tight row.
export function TaskActionsMenu({
  open,
  onToggle,
  onClose,
  onMoveToDate,
  onMoveToTomorrow,
  onDelete,
  selectionCount,
}: TaskActionsMenuProps) {
  const suffix = selectionCount && selectionCount > 1 ? ` (${selectionCount})` : "";
  const ref = useRef<HTMLDivElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // The menu itself stays mounted between opens (only its dropdown content
  // is conditionally rendered), so a stale confirm from a previous open
  // would otherwise still be showing next time this menu opens.
  useEffect(() => {
    if (!open) setConfirmingDelete(false);
  }, [open]);

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
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              onMoveToTomorrow();
              onClose();
            }}
            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100"
          >
            <span className="flex items-center gap-2">
              <ArrowRight size={14} /> Move to tomorrow{suffix}
            </span>
            <span className="text-xs text-slate-400">⇧⌘T</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onMoveToDate();
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100"
          >
            <CalendarClock size={14} /> Move to date...{suffix}
          </button>
          {confirmingDelete ? (
            <div className="flex items-center justify-between px-3 py-1.5 text-red-600">
              <span>Delete{suffix}?</span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="font-medium underline hover:text-red-800"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="font-medium text-slate-500 underline hover:text-slate-700"
                >
                  No
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} /> Delete{suffix}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
