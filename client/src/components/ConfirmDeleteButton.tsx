import { useState } from "react";
import { Trash2 } from "lucide-react";

// A trash icon that swaps itself for an inline "Delete? Yes / No" before
// firing, same idea as TaskActionsMenu's Delete item -- guards against one
// stray click wiping out a note.
export function ConfirmDeleteButton({
  label,
  iconSize = 14,
  onConfirm,
}: {
  label: string;
  iconSize?: number;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs text-red-600">
        Delete?
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          className="font-medium underline hover:text-red-800"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="font-medium text-slate-500 underline hover:text-slate-700"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => setConfirming(true)}
      className="text-slate-400 hover:text-red-600"
    >
      <Trash2 size={iconSize} />
    </button>
  );
}
