import request from "supertest";
import { app } from "./app";
import { prisma } from "./lib/prisma";
import { signToken } from "./lib/auth";

// 2026-11-03 is a Tuesday. The window runs 60 days ahead, to 2027-01-02.
const TODAY = "2026-11-03";
const TUESDAYS = ["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24", "2026-12-01", "2026-12-08", "2026-12-15", "2026-12-22", "2026-12-29"];

let ids: { ada: bigint; mel: bigint; todo: bigint; done: bigint };
let ada: ReturnType<typeof as>;
let mel: ReturnType<typeof as>;

function as(token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  return {
    get: (url: string) => request(app).get(url).set(auth),
    post: (url: string, body?: object) => request(app).post(url).set(auth).send(body),
    patch: (url: string, body: object) => request(app).patch(url).set(auth).send(body),
    delete: (url: string) => request(app).delete(url).set(auth),
  };
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE tasks, notes, event_project_tags, projects, statuses, priority_groups, recurring_tasks, users RESTART IDENTITY CASCADE`,
  );
  const a = await prisma.user.create({ data: { firstName: "Ada", lastName: "A", nickname: "ada", email: "ada@example.com" } });
  const m = await prisma.user.create({ data: { firstName: "Mel", lastName: "M", nickname: "mel", email: "mel@example.com" } });
  const todo = await prisma.status.create({ data: { statusCode: "N", ordinal: 1, isDefault: true } });
  const done = await prisma.status.create({ data: { statusCode: "D", ordinal: 2, isComplete: true } });
  ids = { ada: a.id, mel: m.id, todo: todo.id, done: done.id };
  ada = as(signToken({ userId: a.id.toString(), nickname: "ada" }));
  mel = as(signToken({ userId: m.id.toString(), nickname: "mel" }));
});

afterAll(() => prisma.$disconnect());

const trash = (over: object = {}) => ({
  description: "Take out the trash",
  frequency: "WEEKLY",
  weekdays: [2],
  startDate: "2026-10-01",
  today: TODAY,
  ...over,
});

async function occurrences(seriesId: string | bigint) {
  const rows = await prisma.task.findMany({ where: { seriesId: BigInt(seriesId) }, orderBy: { datePlanned: "asc" } });
  return rows.map((t) => ({ ...t, day: t.datePlanned.toISOString().slice(0, 10) }));
}

async function createTrash(over: object = {}) {
  const res = await ada.post("/api/recurring-tasks", trash(over));
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe("creating a series", () => {
  it("creates ordinary tasks for each matching day in the next 60 days", async () => {
    const id = await createTrash();
    const rows = await occurrences(id);
    expect(rows.map((r) => r.day)).toEqual(TUESDAYS);
    expect(rows[0]).toMatchObject({
      description: "Take out the trash",
      ownerId: ids.ada,
      assigneeId: ids.ada,
      statusId: ids.todo,
    });
  });

  it("shows occurrences in the normal day list, marked with their series", async () => {
    const id = await createTrash();
    const res = await ada.get("/api/tasks?date=2026-11-10");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].seriesId).toBe(id);
  });

  it("rejects an invalid rule, or a missing 'today'", async () => {
    expect((await ada.post("/api/recurring-tasks", trash({ weekdays: [] }))).status).toBe(400);
    expect((await ada.post("/api/recurring-tasks", trash({ frequency: "HOURLY" }))).status).toBe(400);
    expect((await ada.post("/api/recurring-tasks", trash({ today: undefined }))).status).toBe(400);
    expect((await ada.post("/api/recurring-tasks", trash({ description: "  " }))).status).toBe(400);
    expect((await ada.post("/api/recurring-tasks", trash({ projectId: "999" }))).status).toBe(400);
  });
});

describe("sync", () => {
  it("creates nothing the second time", async () => {
    await createTrash();
    expect((await ada.post("/api/recurring-tasks/sync", { today: TODAY })).body).toEqual({ created: 0 });
  });

  it("extends the window as days pass", async () => {
    const id = await createTrash();
    const res = await ada.post("/api/recurring-tasks/sync", { today: "2026-11-24" });
    expect(res.body.created).toBeGreaterThan(0);
    const days = (await occurrences(id)).map((r) => r.day);
    expect(days).toContain("2027-01-19"); // 24 Nov + 60 days = 23 Jan
    expect(new Set(days).size).toBe(days.length);
  });

  it("does not bring back an occurrence the user deleted", async () => {
    const id = await createTrash();
    const second = (await occurrences(id))[1];
    expect((await ada.delete(`/api/tasks/${second.id}`)).status).toBe(204);
    await ada.post("/api/recurring-tasks/sync", { today: "2026-11-05" });
    expect((await occurrences(id)).map((r) => r.day)).not.toContain("2026-11-10");
  });

  it("requires today", async () => {
    expect((await ada.post("/api/recurring-tasks/sync", {})).status).toBe(400);
  });
});

describe("missed occurrences", () => {
  async function missedTuesdays(skipIfMissed: boolean) {
    const id = await createTrash({ skipIfMissed });
    const rows = await occurrences(id);
    // Finish the 3rd, leave the 10th undone; it's now the 11th.
    await prisma.task.update({ where: { id: rows[0].id }, data: { statusId: ids.done } });
    await ada.post("/api/recurring-tasks/sync", { today: "2026-11-11" });
    return (await occurrences(id)).map((r) => r.day);
  }

  it("keeps an unfinished past occurrence by default", async () => {
    expect(await missedTuesdays(false)).toEqual(expect.arrayContaining(["2026-11-03", "2026-11-10"]));
  });

  it("drops an unfinished past occurrence when skipIfMissed is on, but keeps finished ones", async () => {
    const days = await missedTuesdays(true);
    expect(days).toContain("2026-11-03");
    expect(days).not.toContain("2026-11-10");
    expect(days).toContain("2026-11-17");
  });
});

describe("editing a series", () => {
  it("re-lays out upcoming days when the schedule changes, keeping finished ones", async () => {
    const id = await createTrash();
    const rows = await occurrences(id);
    await prisma.task.update({ where: { id: rows[0].id }, data: { statusId: ids.done } });

    const res = await ada.patch(`/api/recurring-tasks/${id}`, { weekdays: [4], today: TODAY });
    expect(res.status).toBe(200);

    const days = (await occurrences(id)).map((r) => r.day);
    expect(days[0]).toBe("2026-11-03"); // the finished Tuesday stays
    expect(days.slice(1, 4)).toEqual(["2026-11-05", "2026-11-12", "2026-11-19"]); // Thursdays now
    expect(days).not.toContain("2026-11-10");
  });

  it("carries a new description to upcoming occurrences without touching their status", async () => {
    const id = await createTrash();
    const rows = await occurrences(id);
    await prisma.task.update({ where: { id: rows[1].id }, data: { statusId: ids.done } });

    await ada.patch(`/api/recurring-tasks/${id}`, { description: "Trash and recycling", today: TODAY });

    const after = await occurrences(id);
    expect(after[2].description).toBe("Trash and recycling");
    expect(after[1].description).toBe("Take out the trash"); // finished: left as history
    expect(after[1].statusId).toBe(ids.done);
    expect(after).toHaveLength(TUESDAYS.length);
  });

  it("validates the merged rule", async () => {
    const id = await createTrash();
    expect((await ada.patch(`/api/recurring-tasks/${id}`, { frequency: "MONTHLY", today: TODAY })).status).toBe(400);
  });
});

describe("deleting a series", () => {
  it("removes upcoming unfinished occurrences and keeps the rest as plain tasks", async () => {
    const id = await createTrash();
    const rows = await occurrences(id);
    await prisma.task.update({ where: { id: rows[0].id }, data: { statusId: ids.done } });

    expect((await ada.delete(`/api/recurring-tasks/${id}?today=2026-11-04`)).status).toBe(204);

    const left = await prisma.task.findMany({ orderBy: { datePlanned: "asc" } });
    expect(left.map((t) => t.datePlanned.toISOString().slice(0, 10))).toEqual(["2026-11-03"]);
    expect(left[0].seriesId).toBeNull();
    expect(await prisma.recurringTask.count()).toBe(0);
  });
});

describe("ownership", () => {
  it("keeps series private to their owner", async () => {
    const id = await createTrash();
    expect((await mel.get("/api/recurring-tasks")).body).toEqual([]);
    expect((await mel.patch(`/api/recurring-tasks/${id}`, { description: "x", today: TODAY })).status).toBe(404);
    expect((await mel.delete(`/api/recurring-tasks/${id}?today=${TODAY}`)).status).toBe(404);
    expect((await mel.get("/api/tasks?date=2026-11-10")).body).toEqual([]);
    expect((await ada.get("/api/recurring-tasks")).body).toHaveLength(1);
  });

  it("only syncs the signed-in user's own series", async () => {
    await createTrash();
    await prisma.task.deleteMany();
    expect((await mel.post("/api/recurring-tasks/sync", { today: TODAY })).body).toEqual({ created: 0 });
    expect(await prisma.task.count()).toBe(0);
  });
});
