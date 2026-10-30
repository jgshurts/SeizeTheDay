import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../../lib/api";

export function CalendarTab({ onChanged }: { onChanged: () => void }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ connected: boolean }>("/calendar/settings").then((s) => setConnected(s.connected));
  }, []);

  async function save(icalUrl: string | null) {
    setError(null);
    setBusy(true);
    try {
      const res = await api.put<{ connected: boolean }>("/calendar/settings", { icalUrl });
      setConnected(res.connected);
      setUrl("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save calendar");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    save(url);
  }

  if (connected === null) return null;

  return (
    <div className="max-w-xl space-y-3 text-sm text-slate-600">
      <p>
        The Schedule column shows events from a calendar feed. In Google Calendar, open{" "}
        <strong>Settings</strong>, pick your calendar, and under <strong>Integrate calendar</strong>{" "}
        copy the <strong>Secret address in iCal format</strong>. Calendars from Apple, Outlook and
        others offer a similar private link.
      </p>
      <p className="text-xs text-slate-500">
        Anyone with that address can read the calendar, so it is stored privately and never shown
        again here. To change it, paste a new one; to stop sharing it, disconnect, or reset it in
        Google Calendar.
      </p>

      {error && <p className="text-red-600">{error}</p>}
      <p>
        Status:{" "}
        <strong className={connected ? "text-green-700" : "text-slate-500"}>
          {connected ? "Connected" : "Not connected"}
        </strong>
      </p>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          aria-label="Calendar address"
          autoComplete="off"
          required
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {connected ? "Replace" : "Connect"}
        </button>
      </form>

      {connected && (
        <button
          type="button"
          disabled={busy}
          onClick={() => save(null)}
          className="text-red-600 hover:underline disabled:opacity-50"
        >
          Disconnect calendar
        </button>
      )}
    </div>
  );
}
