import { stripNoteRefs } from "./noteRefs";
import { groupTasksForReport } from "./taskReport";
import type { Status, Task } from "../types";

const status = (o: Partial<Status>): Status => ({
  id: "1", statusCode: "-", isComplete: false, isBlocked: false, backgroundColor: null,
  foregroundColor: null, description: null, ordinal: 0, isDefault: false, ...o,
});
const task = (id: string, s: Status | null, datePlanned = "2026-11-01T00:00:00.000Z"): Task =>
  ({ id, status: s, datePlanned, priorityGroup: null, prtyOrdinal: null }) as unknown as Task;

describe("stripNoteRefs", () => {
  it("removes @refs and tidies whitespace", () => {
    expect(stripNoteRefs("Review @CDI-DASH spec")).toBe("Review spec");
    expect(stripNoteRefs("Ship it, see @ABC.")).toBe("Ship it, see");
    expect(stripNoteRefs("mail bob@example.com")).toBe("mail bob@example.com");
  });
});

describe("groupTasksForReport", () => {
  it("orders completed, in progress, blocked, not started", () => {
    const groups = groupTasksForReport([
      task("a", null),
      task("b", status({ isBlocked: true })),
      task("c", status({ statusCode: ">" })),
      task("d", status({ isComplete: true })),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["completed", "inProgress", "blocked", "notStarted"]);
    expect(groups.map((g) => g.tasks[0].id)).toEqual(["d", "c", "b", "a"]);
  });
});
