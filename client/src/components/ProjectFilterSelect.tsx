import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Project } from "../types";

interface ProjectFilterSelectProps {
  projects: Project[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}

// A separate filter from the Banner's "context project" -- that one drives
// what new tasks/notes get assigned to, while this one only narrows which
// rows the Tasks grid shows, and can hold any combination of projects.
export function ProjectFilterSelect({ projects, selectedIds, onChange }: ProjectFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  const label =
    selectedIds.size === 0
      ? "All Projects"
      : selectedIds.size === 1
        ? (projects.find((p) => selectedIds.has(p.id))?.name ?? "1 project")
        : `${selectedIds.size} projects`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 rounded border px-2 py-1 text-sm ${
          selectedIds.size > 0
            ? "border-amber-400 bg-amber-100 font-medium text-amber-800"
            : "border-slate-300 text-slate-600 hover:bg-slate-100"
        }`}
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded border border-slate-300 bg-white py-1 shadow-lg">
          {projects.length === 0 ? (
            <p className="px-3 py-1.5 text-xs text-slate-400">No projects yet</p>
          ) : (
            projects.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <span className="truncate">{p.name}</span>
              </label>
            ))
          )}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="mt-1 block w-full border-t border-slate-100 px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
