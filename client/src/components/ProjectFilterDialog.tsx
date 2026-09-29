import { useState } from "react";
import { Modal } from "./Modal";
import type { Project } from "../types";

// Picks which projects the Banner filters Tasks/Notes to. Nothing checked
// means "All Projects" -- same as the old dropdown's empty option -- and
// changes only take effect on Apply, so toggling several boxes doesn't
// refetch the day once per click.
export function ProjectFilterDialog({
  projects,
  selectedIds,
  onApply,
  onClose,
}: {
  projects: Project[];
  selectedIds: string[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selectedIds));

  function toggle(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function apply() {
    // Kept in project-list order so the first id is stable -- MainPage uses
    // it as the default project for newly added tasks and notes.
    onApply(projects.filter((p) => draft.has(p.id)).map((p) => p.id));
    onClose();
  }

  return (
    <Modal title="Filter Projects" onClose={onClose} maxWidthClassName="max-w-sm">
      {projects.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No projects yet.</p>
      ) : (
        <ul className="space-y-1">
          {projects.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={draft.has(p.id)} onChange={() => toggle(p.id)} />
                {p.color && (
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-sm border border-black/10"
                    style={{ backgroundColor: p.color }}
                  />
                )}
                {p.name}
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={() => setDraft(new Set())}
          disabled={draft.size === 0}
          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear (All Projects)
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}
