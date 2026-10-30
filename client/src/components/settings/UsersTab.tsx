import { useEffect, useState } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import type { User } from "../../types";

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [draftFirstName, setDraftFirstName] = useState("");
  const [draftLastName, setDraftLastName] = useState("");
  const [draftNickname, setDraftNickname] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ nickname: string; url: string; expiresAt: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

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
        email: draftEmail,
      });
      setUsers((prev) => [...prev, user].sort((a, b) => a.nickname.localeCompare(b.nickname)));
      setDraftFirstName("");
      setDraftLastName("");
      setDraftNickname("");
      setDraftEmail("");
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

  // Creates a one-time link the person opens to choose their password --
  // for a new user, or to reset a forgotten one. Nothing is emailed; the
  // admin passes the link along.
  async function createInvite(user: User) {
    setError(null);
    setCopied(false);
    try {
      const res = await api.post<{ token: string; expiresAt: string }>(`/users/${user.id}/invite`);
      setInvite({
        nickname: user.nickname,
        url: `${window.location.origin}/?invite=${res.token}`,
        expiresAt: res.expiresAt,
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, invitePending: true } : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create invite link");
    }
  }

  async function copyInvite() {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.url);
    setCopied(true);
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
      <p className="mb-2 text-xs text-slate-500">
        Add a user, then create an invite link and send it to them -- opening it lets them choose a
        password. The same button makes a fresh link if someone forgets theirs.
      </p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {invite && (
        <div className="mb-3 rounded border border-indigo-200 bg-indigo-50 p-3 text-sm">
          <p className="mb-1 text-slate-700">
            Invite link for <strong>{invite.nickname}</strong> (expires{" "}
            {new Date(invite.expiresAt).toLocaleDateString()}). Shown only now -- copy it before
            closing.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={invite.url}
              onFocus={(e) => e.target.select()}
              aria-label="Invite link"
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={copyInvite}
              className="flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-700"
            >
              <Copy size={14} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="px-2 py-1">First name</th>
            <th className="px-2 py-1">Last name</th>
            <th className="px-2 py-1">Nickname</th>
            <th className="px-2 py-1">Email</th>
            <th className="px-2 py-1">Sign-in</th>
            <th className="w-16 px-2 py-1" />
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
                  defaultValue={u.email}
                  onBlur={(e) => updateUser(u.id, { email: e.target.value })}
                  className="w-full rounded border border-slate-200 px-1"
                />
              </td>
              <td className="px-2 py-1 text-xs text-slate-500">
                {u.hasPassword ? "Ready" : u.invitePending ? "Invited" : "No password"}
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  aria-label={`Create invite link for ${u.nickname}`}
                  title={u.hasPassword ? "New link (reset password)" : "Create invite link"}
                  onClick={() => createInvite(u)}
                  className="mr-2 text-slate-400 hover:text-indigo-600"
                >
                  <KeyRound size={16} />
                </button>
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
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded border border-slate-300 px-1"
              />
            </td>
            <td className="px-2 py-1" />
            <td className="px-2 py-1" />
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        onClick={addUser}
        disabled={!draftFirstName || !draftLastName || !draftNickname || !draftEmail}
        className="mt-2 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Add user
      </button>
    </div>
  );
}
