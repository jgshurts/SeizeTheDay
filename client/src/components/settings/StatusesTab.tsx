import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { Status } from "../../types";

export function StatusesTab() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [draftCode, setDraftCode] = useState("");
  const [draftComplete, setDraftComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Status[]>("/statuses").then(setStatuses);
  }, []);

  async function addStatus() {
    setError(null);
    try {
      const status = await api.post<Status>("/statuses", {
        statusCode: draftCode,
        isComplete: draftComplete,
      });
      setStatuses((prev) => [...prev, status].sort((a, b) => a.statusCode.localeCompare(b.statusCode)));
      setDraftCode("");
      setDraftComplete(false);
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

  async function deleteStatus(id: string) {
    setError(null);
    try {
      await api.delete(`/statuses/${id}`);
      setStatuses((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete status");
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="w-16 px-2 py-1">Code</th>
            <th className="px-2 py-1">Complete?</th>
            <th className="w-8 px-2 py-1" />
          </tr>
        </thead>
        <tbody>
          {statuses.map((s) => (
            <tr key={s.id} className="border-t border-slate-100">
              <td className="px-2 py-1">
                <input
                  defaultValue={s.statusCode}
                  maxLength={1}
                  onBlur={(e) => updateStatus(s.id, { statusCode: e.target.value })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="checkbox"
                  checked={s.isComplete}
                  onChange={(e) => updateStatus(s.id, { isComplete: e.target.checked })}
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
            <td className="px-2 py-1">
              <input
                value={draftCode}
                maxLength={1}
                onChange={(e) => setDraftCode(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1">
              <input
                type="checkbox"
                checked={draftComplete}
                onChange={(e) => setDraftComplete(e.target.checked)}
              />
            </td>
            <td className="px-2 py-1" />
          </tr>
        </tbody>
      </table>
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
