import { api, ApiError } from "./api";
import type { Note } from "../types";

// Shared across every badge on the page so opening the same ref twice
// (e.g. once in a task, once in a note) doesn't refetch it.
const noteRefCache = new Map<string, Promise<Note | null>>();

export function fetchNoteByRef(shortRef: string): Promise<Note | null> {
  const key = shortRef.toLowerCase();
  let cached = noteRefCache.get(key);
  if (!cached) {
    cached = api.get<Note>(`/notes/by-ref/${encodeURIComponent(shortRef)}`).catch((err) => {
      if (err instanceof ApiError && err.status === 404) return null;
      noteRefCache.delete(key);
      throw err;
    });
    noteRefCache.set(key, cached);
  }
  return cached;
}

// Drops a ref's cached note after it's edited or deleted, so the next
// preview of it fetches the current version instead of the stale one.
export function forgetCachedNoteRef(shortRef: string) {
  noteRefCache.delete(shortRef.toLowerCase());
}
