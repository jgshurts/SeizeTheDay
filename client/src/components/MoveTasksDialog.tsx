import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Modal } from "./Modal";
import { addDays, formatDisplay } from "../lib/date";
import type { Task } from "../types";

export interface TaskMove {
  taskId: string;
  date: string;
}

interface MoveTasksDialogProps {
  title: string;
  emptyMessage: string;
  activeDate: string;
  tasks: Task[];
  onMove: (moves: TaskMove[]) => Promise<void>;
  onClose: () => void;
}

export function MoveTasksDialog({
  title,
  emptyMessage,
  activeDate,
  tasks,
  onMove,
  onClose,
}: MoveTasksDialogProps) {
  const [globalDate, setGlobalDate] = useState(() => addDays(activeDate, 1));
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [moving, setMoving] = useState(false);

  function effectiveDate(taskId: string): string {
    return overrides[taskId] ?? globalDate;
  }

  function setOverride(taskId: string, date: string) {
    setOverrides((prev) => ({ ...prev, [taskId]: date }));
  }

  function clearOverride(taskId: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }

  async function handleMove() {
    setMoving(true);
    try {
      await onMove(tasks.map((t) => ({ taskId: t.id, date: effectiveDate(t.id) })));
      onClose();
    } finally {
      setMoving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <>
          <label className="mb-1 block text-sm font-medium text-slate-600" htmlFor="move-date">
            Move {tasks.length} task
            {tasks.length === 1 ? "" : "s"} from {formatDisplay(activeDate)} to:
          </label>
          <input
            id="move-date"
            type="date"
            value={globalDate}
            onChange={(e) => setGlobalDate(e.target.value)}
            className="mb-1 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <p className="mb-4 text-xs text-slate-400">
            Applies to every task below unless you set a different date for it individually.
          </p>

          <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto">
            {tasks.map((t) => {
              const overridden = t.id in overrides;
              return (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate text-slate-600">{t.description}</span>
                  <input
                    type="date"
                    value={effectiveDate(t.id)}
                    onChange={(e) => setOverride(t.id, e.target.value)}
                    className={`rounded border px-1.5 py-0.5 text-xs ${
                      overridden ? "border-amber-400 bg-amber-50" : "border-slate-200"
                    }`}
                  />
                  {overridden && (
                    <button
                      type="button"
                      aria-label={`Use default date for ${t.description}`}
                      onClick={() => clearOverride(t.id)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMove}
              disabled={moving}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {moving ? "Moving..." : "Move"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
