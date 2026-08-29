import type { ReactNode } from "react";

export const DEFAULT_SUB_BANNER_COLOR = "#e2e8f0"; // slate-200

export const ADD_BUTTON_CLASS =
  "flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-sm text-white hover:bg-indigo-700";

interface ColumnHeaderProps {
  label: string;
  color: string | null | undefined;
  children: ReactNode;
}

// Shared header strip for the Tasks/Schedule/Notes columns -- each one
// renders this at its own top, inside its own (independently resizable)
// container, rather than a single fixed-width banner spanning all three --
// a single banner can't track three panes that each resize on their own.
// Consistency comes from reusing this component and ADD_BUTTON_CLASS, not
// from shared positioning.
export function ColumnHeader({ label, color, children }: ColumnHeaderProps) {
  return (
    <div
      className="mb-2 flex items-center justify-between rounded px-3 py-2"
      style={{ backgroundColor: color ?? DEFAULT_SUB_BANNER_COLOR }}
    >
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </div>
  );
}
