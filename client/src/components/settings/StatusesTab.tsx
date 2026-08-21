import { useEffect, useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { Status } from "../../types";

const DEFAULT_BG = "#e5e7eb";
const DEFAULT_FG = "#374151";

export function StatusesTab() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [draftCode, setDraftCode] = useState("");
  const [draftComplete, setDraftComplete] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [draftBackground, setDraftBackground] = useState(DEFAULT_BG);
  const [draftForeground, setDraftForeground] = useState(DEFAULT_FG);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Status[]>("/statuses").then(setStatuses);
  }, []);

  async function addStatus() {
    setError(null);
    try {
      const status = await api.post<Status>("/statuses", {
        statusCode: draftCode,
        ordinal: statuses.length + 1,
        isComplete: draftComplete,
        description: draftDescription || null,
        backgroundColor: draftBackground,
        foregroundColor: draftForeground,
      });
      setStatuses((prev) => [...prev, status].sort((a, b) => a.ordinal - b.ordinal));
      setDraftCode("");
      setDraftComplete(false);
      setDraftDescription("");
      setDraftBackground(DEFAULT_BG);
      setDraftForeground(DEFAULT_FG);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add status");
    }
  }

  async function updateStatus(id: string, patch: Record<string, unknown>) {
    setError(null);
    try {
      const updated = await api.patch<Status>(`/statuses/${id}`, patch);
      setStatuses((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    }
  }

  // Only one status can be default at a time. Update every row locally so
  // the radio reflects the change immediately, rather than waiting on a
  // response that only carries the one row the PATCH targeted.
  async function setDefaultStatus(id: string) {
    setError(null);
    setStatuses((prev) => prev.map((s) => ({ ...s, isDefault: s.id === id })));
    try {
      await api.patch<Status>(`/statuses/${id}`, { isDefault: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to set default status");
    }
  }

  async function deleteStatus(id: string) {
    setError(null);
    try {
      await api.delete(`/statuses/${id}`);
      setStatuses((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete status");
    }
  }

  // Reordering: drop a dragged row onto a target row to move it there, then
  // recompute every row's ordinal from its new position and persist only
  // the ones that actually changed.
  async function handleDrop(targetId: string) {
    const sourceId = draggedId;
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;

    const fromIndex = statuses.findIndex((s) => s.id === sourceId);
    const toIndex = statuses.findIndex((s) => s.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...statuses];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const renumbered = reordered.map((s, i) => ({ ...s, ordinal: i + 1 }));
    setStatuses(renumbered);

    const changed = renumbered.filter((s) => {
      const original = statuses.find((orig) => orig.id === s.id);
      return original && original.ordinal !== s.ordinal;
    });

    setError(null);
    try {
      await Promise.all(
        changed.map((s) => api.patch<Status>(`/statuses/${s.id}`, { ordinal: s.ordinal })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save new order");
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="w-6 px-1 py-1" />
            <th className="w-16 px-2 py-1">Code</th>
            <th className="w-16 px-2 py-1">Default?</th>
            <th className="px-2 py-1">Complete?</th>
            <th className="px-2 py-1">Description</th>
            <th className="w-16 px-2 py-1">Bg</th>
            <th className="w-16 px-2 py-1">Fg</th>
            <th className="w-8 px-2 py-1" />
          </tr>
        </thead>
        <tbody>
          {statuses.map((s) => (
            <tr
              key={s.id}
              draggable
              onDragStart={() => setDraggedId(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(s.id)}
              className={`border-t border-slate-100 ${draggedId === s.id ? "opacity-40" : ""}`}
            >
              <td className="cursor-grab px-1 py-1 text-slate-400 active:cursor-grabbing">
                <GripVertical size={16} />
              </td>
              <td className="px-2 py-1">
                <input
                  defaultValue={s.statusCode}
                  maxLength={1}
                  onBlur={(e) => updateStatus(s.id, { statusCode: e.target.value })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1 text-center">
                <input
                  type="radio"
                  name="default-status"
                  aria-label={`Make ${s.statusCode} the default status`}
                  checked={s.isDefault}
                  onChange={() => setDefaultStatus(s.id)}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="checkbox"
                  checked={s.isComplete}
                  onChange={(e) => updateStatus(s.id, { isComplete: e.target.checked })}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  defaultValue={s.description ?? ""}
                  onBlur={(e) => updateStatus(s.id, { description: e.target.value || null })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="color"
                  value={s.backgroundColor ?? DEFAULT_BG}
                  onChange={(e) => updateStatus(s.id, { backgroundColor: e.target.value })}
                  className="h-7 w-full rounded border border-slate-200"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="color"
                  value={s.foregroundColor ?? DEFAULT_FG}
                  onChange={(e) => updateStatus(s.id, { foregroundColor: e.target.value })}
                  className="h-7 w-full rounded border border-slate-200"
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  aria-label="Delete status"
                  onClick={() => deleteStatus(s.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          <tr className="border-t border-slate-200">
            <td className="px-1 py-1" />
            <td className="px-2 py-1">
              <input
                value={draftCode}
                maxLength={1}
                onChange={(e) => setDraftCode(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1" />
            <td className="px-2 py-1">
              <input
                type="checkbox"
                checked={draftComplete}
                onChange={(e) => setDraftComplete(e.target.checked)}
              />
            </td>
            <td className="px-2 py-1">
              <input
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1">
              <input
                type="color"
                value={draftBackground}
                onChange={(e) => setDraftBackground(e.target.value)}
                className="h-7 w-full rounded border border-slate-300"
              />
            </td>
            <td className="px-2 py-1">
              <input
                type="color"
                value={draftForeground}
                onChange={(e) => setDraftForeground(e.target.value)}
                className="h-7 w-full rounded border border-slate-300"
              />
            </td>
            <td className="px-2 py-1" />
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-400">Drag rows by the handle to reorder.</p>
      <button
        type="button"
        onClick={addStatus}
        disabled={!draftCode}
        className="mt-2 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Add status
      </button>
    </div>
  );
}
