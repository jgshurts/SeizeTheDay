import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../../lib/api";

const MIN_PASSWORD_LENGTH = 10;

export function AccountTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match");
      return;
    }
    setBusy(true);
    try {
      await api.patch("/users/me/password", { currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded border border-slate-300 px-2 py-1";

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      <h3 className="font-medium text-slate-700">Change password</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Password changed.</p>}
      <label className="block text-sm text-slate-600">
        Current password
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      <label className="block text-sm text-slate-600">
        New password
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          required
          className={inputClass}
        />
        <span className="text-xs text-slate-400">At least {MIN_PASSWORD_LENGTH} characters.</span>
      </label>
      <label className="block text-sm text-slate-600">
        Confirm new password
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Change password
      </button>
    </form>
  );
}
