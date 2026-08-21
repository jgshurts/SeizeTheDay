import { useEffect, useRef, useState } from "react";
import type { Status } from "../types";

interface StatusSelectProps {
  statuses: Status[];
  value: string | null;
  onChange: (statusId: string) => void;
}

// Native <select> can't reliably color individual <option> rows across
// browsers (Safari in particular ignores option styling), so the Sta column
// needs its own listbox to show each status's background/foreground color
// both when closed and in the open dropdown.
export function StatusSelect({ statuses, value, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = statuses.find((s) => s.id === value) ?? null;

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

  function select(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={selected?.description ?? undefined}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          backgroundColor: selected?.backgroundColor ?? undefined,
          color: selected?.foregroundColor ?? undefined,
        }}
        className="w-full truncate rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-xs"
      >
        {selected?.statusCode ?? "-"}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-20 overflow-hidden rounded border-2 border-slate-400 bg-white shadow-lg">
          {statuses.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.description ?? undefined}
              onClick={() => select(s.id)}
              style={{
                backgroundColor: s.backgroundColor ?? undefined,
                color: s.foregroundColor ?? undefined,
              }}
              className="block w-full px-2 py-1 text-center text-xs hover:opacity-80"
            >
              {s.statusCode}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
