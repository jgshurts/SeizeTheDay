import { useState } from "react";
import { Modal } from "./Modal";

interface MoveTaskDateDialogProps {
  taskDescription: string;
  currentDate: string;
  onMove: (date: string) => Promise<void>;
  onClose: () => void;
}

export function MoveTaskDateDialog({
  taskDescription,
  currentDate,
  onMove,
  onClose,
}: MoveTaskDateDialogProps) {
  const [date, setDate] = useState(currentDate);
  const [moving, setMoving] = useState(false);

  async function handleMove() {
    setMoving(true);
    try {
      await onMove(date);
      onClose();
    } finally {
      setMoving(false);
    }
  }

  return (
    <Modal title="Move Task" onClose={onClose}>
      <p className="mb-3 truncate text-sm text-slate-600">{taskDescription}</p>

      <label className="mb-1 block text-sm font-medium text-slate-600" htmlFor="move-task-date">
        New date
      </label>
      <input
        id="move-task-date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-4 rounded border border-slate-300 px-2 py-1 text-sm"
      />

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
    </Modal>
  );
}
