import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { PriorityGroup } from "../../types";

export function PriorityGroupsTab() {
  const [groups, setGroups] = useState<PriorityGroup[]>([]);
  const [draftPrty, setDraftPrty] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<PriorityGroup[]>("/priority-groups").then(setGroups);
  }, []);

  async function addGroup() {
    setError(null);
    try {
      const group = await api.post<PriorityGroup>("/priority-groups", {
        prty: Number(draftPrty),
        prtyCode: draftCode,
        description: draftDescription || null,
      });
      setGroups((prev) => [...prev, group].sort((a, b) => a.prty - b.prty));
      setDraftPrty("");
      setDraftCode("");
      setDraftDescription("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add priority group");
    }
  }

  async function updateGroup(id: string, patch: Record<string, unknown>) {
    setError(null);
    try {
      const updated = await api.patch<PriorityGroup>(`/priority-groups/${id}`, patch);
      setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update priority group");
    }
  }

  async function deleteGroup(id: string) {
    setError(null);
    try {
      await api.delete(`/priority-groups/${id}`);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete priority group");
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="w-16 px-2 py-1">Prty</th>
            <th className="w-16 px-2 py-1">Code</th>
            <th className="px-2 py-1">Description</th>
            <th className="w-8 px-2 py-1" />
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="border-t border-slate-100">
              <td className="px-2 py-1">
                <input
                  type="number"
                  defaultValue={g.prty}
                  onBlur={(e) => updateGroup(g.id, { prty: Number(e.target.value) })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  defaultValue={g.prtyCode}
                  maxLength={1}
                  onBlur={(e) => updateGroup(g.id, { prtyCode: e.target.value })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  defaultValue={g.description ?? ""}
                  onBlur={(e) => updateGroup(g.id, { description: e.target.value || null })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  aria-label="Delete priority group"
                  onClick={() => deleteGroup(g.id)}
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
                type="number"
                value={draftPrty}
                onChange={(e) => setDraftPrty(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
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
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1" />
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        onClick={addGroup}
        disabled={!draftPrty || !draftCode}
        className="mt-2 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Add priority group
      </button>
    </div>
  );
}
