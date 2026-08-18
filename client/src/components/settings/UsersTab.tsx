import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { User } from "../../types";

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [draftFirstName, setDraftFirstName] = useState("");
  const [draftLastName, setDraftLastName] = useState("");
  const [draftNickname, setDraftNickname] = useState("");
  const [draftPassword, setDraftPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<User[]>("/users").then(setUsers);
  }, []);

  async function addUser() {
    setError(null);
    try {
      const user = await api.post<User>("/users", {
        firstName: draftFirstName,
        lastName: draftLastName,
        nickname: draftNickname,
        password: draftPassword,
      });
      setUsers((prev) => [...prev, user].sort((a, b) => a.nickname.localeCompare(b.nickname)));
      setDraftFirstName("");
      setDraftLastName("");
      setDraftNickname("");
      setDraftPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add user");
    }
  }

  async function updateUser(id: string, patch: Record<string, unknown>) {
    setError(null);
    try {
      const updated = await api.patch<User>(`/users/${id}`, patch);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
    }
  }

  async function deleteUser(id: string) {
    setError(null);
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete user");
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="px-2 py-1">First name</th>
            <th className="px-2 py-1">Last name</th>
            <th className="px-2 py-1">Nickname</th>
            <th className="px-2 py-1">Reset password</th>
            <th className="w-8 px-2 py-1" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="px-2 py-1">
                <input
                  defaultValue={u.firstName}
                  onBlur={(e) => updateUser(u.id, { firstName: e.target.value })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  defaultValue={u.lastName}
                  onBlur={(e) => updateUser(u.id, { lastName: e.target.value })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  defaultValue={u.nickname}
                  onBlur={(e) => updateUser(u.id, { nickname: e.target.value })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="password"
                  placeholder="Leave blank to keep"
                  onBlur={(e) => {
                    if (e.target.value) {
                      updateUser(u.id, { password: e.target.value });
                      e.target.value = "";
                    }
                  }}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  aria-label="Delete user"
                  onClick={() => deleteUser(u.id)}
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
                value={draftFirstName}
                onChange={(e) => setDraftFirstName(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1">
              <input
                value={draftLastName}
                onChange={(e) => setDraftLastName(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1">
              <input
                value={draftNickname}
                onChange={(e) => setDraftNickname(e.target.value)}
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1">
              <input
                type="password"
                value={draftPassword}
                onChange={(e) => setDraftPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1" />
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        onClick={addUser}
        disabled={!draftFirstName || !draftLastName || !draftNickname || !draftPassword}
        className="mt-2 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Add user
      </button>
    </div>
  );
}
