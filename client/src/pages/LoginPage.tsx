import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";

// The ?invite=<token> a user arrives with from the link an admin sent them.
function takeInviteToken(): string | null {
  return new URLSearchParams(window.location.search).get("invite");
}

function leaveInvite() {
  window.history.replaceState({}, "", window.location.pathname);
}

const MIN_PASSWORD_LENGTH = 10;

const inputClass = "w-full rounded border border-slate-300 px-3 py-2 text-slate-800";
const buttonClass =
  "w-full rounded bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-800">Seize the Day</h1>
        {children}
      </div>
    </div>
  );
}

function SignInForm() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="mb-6 text-center text-sm text-slate-500">Sign in to open your planner.</p>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <label className="block text-sm text-slate-600">
          Nickname or email
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-slate-600">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={busy} className={buttonClass}>
          Sign in
        </button>
        <p className="text-center text-xs text-slate-400">
          Forgot your password? Ask an admin for a new invite link.
        </p>
      </form>
    </Card>
  );
}

function AcceptInviteForm({ token }: { token: string }) {
  const { signInWithToken } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ firstName: string }>(`/auth/invite/${encodeURIComponent(token)}`)
      .then((invitee) => setName(invitee.firstName))
      .catch(() => setInvalid(true));
  }, [token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ token: string }>(`/auth/invite/${encodeURIComponent(token)}`, {
        password,
      });
      leaveInvite();
      await signInWithToken(res.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your password. Please try again.");
      setBusy(false);
    }
  }

  if (invalid) {
    return (
      <Card>
        <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          This invite link is invalid or has expired. Ask an admin for a new one.
        </p>
        <button type="button" onClick={() => { leaveInvite(); window.location.reload(); }} className="mt-4 w-full text-sm text-indigo-600 hover:underline">
          Back to sign in
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <p className="mb-6 text-center text-sm text-slate-500">
        {name ? `Welcome, ${name}! Choose a password to get started.` : "Checking your invite…"}
      </p>
      {name && (
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <label className="block text-sm text-slate-600">
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              required
              className={inputClass}
            />
            <span className="text-xs text-slate-400">At least {MIN_PASSWORD_LENGTH} characters.</span>
          </label>
          <label className="block text-sm text-slate-600">
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className={inputClass}
            />
          </label>
          <button type="submit" disabled={busy} className={buttonClass}>
            Save password and sign in
          </button>
        </form>
      )}
    </Card>
  );
}

export function LoginPage() {
  const [inviteToken] = useState(takeInviteToken);
  return inviteToken ? <AcceptInviteForm token={inviteToken} /> : <SignInForm />;
}
