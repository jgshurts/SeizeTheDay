import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { DEFAULT_SUB_BANNER_COLOR } from "../components/ColumnHeader";

// The background color currently painted behind the whole app (MainPage's
// own computed backgroundColor: a selected project's tint, else the user's
// theme background, else the app default) -- provided here so components
// nested several levels deep (e.g. NoteRefBadge, reached via TasksColumn/
// NotesColumn/NoteRefText, none of which otherwise care about this value)
// can read it without every intermediate component forwarding a prop it
// doesn't use itself.
const ActiveBackgroundContext = createContext<string>(DEFAULT_SUB_BANNER_COLOR);

export function ActiveBackgroundProvider({
  color,
  children,
}: {
  color: string | null | undefined;
  children: ReactNode;
}) {
  return (
    <ActiveBackgroundContext.Provider value={color ?? DEFAULT_SUB_BANNER_COLOR}>
      {children}
    </ActiveBackgroundContext.Provider>
  );
}

export function useActiveBackground(): string {
  return useContext(ActiveBackgroundContext);
}
