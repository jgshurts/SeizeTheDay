import { useState } from "react";
import { Check } from "lucide-react";
import type { Project } from "../types";

const NONE = "";

interface MobileTextEditorProps {
  title: string;
  initialValue: string;
  onSave: (value: string) => void;
  projects?: Project[];
  projectId?: string | null;
  onProjectChange?: (projectId: string | null) => void;
}

// Floods the top half of the screen with a large edit box -- the inline
// textareas used on desktop (task description, note text) are too cramped
// to be usable on a phone. There's no separate cancel: tapping the
// checkmark or the dimmed backdrop both save and close, so there's nothing
// to accidentally lose. Tasks and notes both carry a project, and on mobile
// there's no grid/card column to set it from, so it rides along here too --
// it saves immediately on change, independent of the text's own save.
export function MobileTextEditor({
  title,
  initialValue,
  onSave,
  projects,
  projectId,
  onProjectChange,
}: MobileTextEditorProps) {
  const [value, setValue] = useState(initialValue);

  function confirm() {
    onSave(value);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="flex h-1/2 flex-col bg-white p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">{title}</h2>
          <button
            type="button"
            aria-label="Save and close"
            onClick={confirm}
            className="rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700"
          >
            <Check size={20} />
          </button>
        </div>
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full flex-1 resize-none rounded border border-slate-300 p-3 text-base"
        />
        {projects && onProjectChange && (
          <select
            aria-label="Project"
            value={projectId ?? NONE}
            onChange={(e) => onProjectChange(e.target.value || null)}
            className="mt-2 rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value={NONE}>No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex-1 bg-black/30" onClick={confirm} />
    </div>
  );
}
