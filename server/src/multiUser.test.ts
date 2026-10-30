import request from "supertest";
import { app } from "./app";
import { prisma } from "./lib/prisma";
import { signToken } from "./lib/auth";
import { hashPassword } from "./lib/password";

const DAY = "2026-10-13";

type Ids = {
  admin: bigint;
  member: bigint;
  todo: bigint;
  done: bigint;
  blocked: bigint;
  pgA: bigint;
};
let ids: Ids;
let adminToken: string;
let memberToken: string;

const asAdmin = () => withToken(adminToken);
const asMember = () => withToken(memberToken);

function withToken(token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  return {
    get: (url: string) => request(app).get(url).set(auth),
    post: (url: string, body?: object) => request(app).post(url).set(auth).send(body),
    patch: (url: string, body: object) => request(app).patch(url).set(auth).send(body),
    delete: (url: string) => request(app).delete(url).set(auth),
  };
}

async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE tasks, notes, event_project_tags, projects, statuses, priority_groups, users RESTART IDENTITY CASCADE`,
  );

  const admin = await prisma.user.create({
    data: { firstName: "Ada", lastName: "Admin", nickname: "ada", email: "ada@example.com", isAdmin: true },
  });
  const member = await prisma.user.create({
    data: { firstName: "Mel", lastName: "Member", nickname: "mel", email: "mel@example.com" },
  });
  const todo = await prisma.status.create({ data: { statusCode: "N", ordinal: 1, isDefault: true } });
  const blocked = await prisma.status.create({ data: { statusCode: "B", ordinal: 2, isBlocked: true } });
  const done = await prisma.status.create({ data: { statusCode: "D", ordinal: 3, isComplete: true } });
  const pgA = await prisma.priorityGroup.create({ data: { prty: 1, prtyCode: "A" } });

  ids = { admin: admin.id, member: member.id, todo: todo.id, done: done.id, blocked: blocked.id, pgA: pgA.id };
  adminToken = signToken({ userId: admin.id.toString(), nickname: admin.nickname });
  memberToken = signToken({ userId: member.id.toString(), nickname: member.nickname });
}

beforeEach(resetDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

async function createTask(as: ReturnType<typeof withToken>, body: object = {}) {
  const res = await as.post("/api/tasks", { description: "a task", datePlanned: DAY, ...body });
  expect(res.status).toBe(201);
  return res.body as { id: string; description: string };
}

async function createNote(as: ReturnType<typeof withToken>, noteText = "a note") {
  const res = await as.post("/api/notes", { contextDate: DAY, noteText });
  expect(res.status).toBe(201);
  return res.body as { id: string; shortRef: string };
}

describe("task isolation", () => {
  it("keeps each user's tasks out of every other user's lists", async () => {
    await createTask(asAdmin(), { description: "admin secret" });
    await createTask(asMember(), { description: "member secret" });

    const lists = [
      `/api/tasks?date=${DAY}`,
      `/api/tasks/unfinished?before=2026-12-31`,
      `/api/tasks/search?q=secret`,
      `/api/tasks/export?status=all`,
    ];
    for (const url of lists) {
      const res = await asMember().get(url);
      expect(res.status).toBe(200);
      expect(res.body.map((t: { description: string }) => t.description)).toEqual(["member secret"]);
    }
  });

  it("treats another user's task as not found for edits and deletes", async () => {
    const task = await createTask(asAdmin());
    expect((await asMember().patch(`/api/tasks/${task.id}`, { description: "hijacked" })).status).toBe(404);
    expect((await asMember().delete(`/api/tasks/${task.id}`)).status).toBe(404);
  });

  it("renumbers only the acting user's own list", async () => {
    const adminTask = await createTask(asAdmin(), { priorityGroupId: ids.pgA.toString(), prtyOrdinal: 7 });
    await createTask(asMember(), { priorityGroupId: ids.pgA.toString(), prtyOrdinal: 5 });

    expect((await asMember().post("/api/tasks/renumber", { date: DAY })).status).toBe(204);
    const untouched = await prisma.task.findUnique({ where: { id: BigInt(adminTask.id) } });
    expect(untouched?.prtyOrdinal).toBe(7);
  });
});

describe("task delegation", () => {
  async function delegatedTask(body: object = {}) {
    return createTask(asAdmin(), { assigneeId: ids.member.toString(), description: "delegated", ...body });
  }

  it("shows a delegated task on both the owner's and the assignee's day", async () => {
    await delegatedTask();
    for (const as of [asAdmin(), asMember()]) {
      const res = await as.get(`/api/tasks?date=${DAY}`);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].assignee.nickname).toBe("mel");
      expect(res.body[0].owner.nickname).toBe("ada");
    }
  });

  it("lets the assignee change status, date and priority", async () => {
    const task = await delegatedTask();
    const res = await asMember().patch(`/api/tasks/${task.id}`, {
      statusId: ids.done.toString(),
      datePlanned: "2026-10-14",
      priorityGroupId: ids.pgA.toString(),
      prtyOrdinal: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.statusId).toBe(ids.done.toString());
    expect(res.body.completedAt).not.toBeNull();
  });

  it.each([
    ["description", "renamed"],
    ["projectId", null],
    ["assigneeId", "1"],
    ["blockerNoteId", null],
  ])("keeps %s owner-only", async (field, value) => {
    const task = await delegatedTask();
    const res = await asMember().patch(`/api/tasks/${task.id}`, { [field]: value });
    expect(res.status).toBe(403);
  });

  it("keeps deletion owner-only", async () => {
    const task = await delegatedTask();
    expect((await asMember().delete(`/api/tasks/${task.id}`)).status).toBe(403);
    expect((await asAdmin().delete(`/api/tasks/${task.id}`)).status).toBe(204);
  });

  it("rejects delegating to a user that doesn't exist", async () => {
    const res = await asAdmin().post("/api/tasks", {
      description: "x",
      datePlanned: DAY,
      assigneeId: "999999",
    });
    expect(res.status).toBe(400);
  });
});

describe("note isolation and linking", () => {
  it("keeps each user's notes off other users' day pages and refs", async () => {
    const note = await createNote(asAdmin());
    expect((await asMember().get(`/api/notes?date=${DAY}`)).body).toEqual([]);
    expect((await asMember().get(`/api/notes/by-ref/${note.shortRef}`)).status).toBe(404);
    expect((await asMember().patch(`/api/notes/${note.id}`, { noteText: "x" })).status).toBe(404);
    expect((await asMember().delete(`/api/notes/${note.id}`)).status).toBe(404);
  });

  it("opens a note to the assignee of a delegated task that mentions it", async () => {
    const note = await createNote(asAdmin(), "the plan");
    await createTask(asAdmin(), {
      assigneeId: ids.member.toString(),
      description: `follow @${note.shortRef} please`,
    });

    const read = await asMember().get(`/api/notes/by-ref/${note.shortRef}`);
    expect(read.status).toBe(200);
    expect(read.body.noteText).toBe("the plan");

    expect((await asMember().patch(`/api/notes/${note.id}`, { noteText: "updated" })).status).toBe(200);
    expect((await asMember().patch(`/api/notes/${note.id}`, { projectId: null })).status).toBe(403);
    expect((await asMember().delete(`/api/notes/${note.id}`)).status).toBe(403);
    // Still not on the assignee's own day page.
    expect((await asMember().get(`/api/notes?date=${DAY}`)).body).toEqual([]);
  });

  it("opens a delegated task's blocker note to the assignee", async () => {
    const note = await createNote(asAdmin());
    const task = await createTask(asAdmin(), { assigneeId: ids.member.toString() });
    expect((await asAdmin().patch(`/api/tasks/${task.id}`, { blockerNoteId: note.id })).status).toBe(200);
    expect((await asMember().get(`/api/notes/by-ref/${note.shortRef}`)).status).toBe(200);
  });

  it("doesn't open a note whose ref merely starts the same way", async () => {
    const note = await createNote(asAdmin());
    await createTask(asAdmin(), {
      assigneeId: ids.member.toString(),
      description: `see @${note.shortRef}X`,
    });
    expect((await asMember().get(`/api/notes/by-ref/${note.shortRef}`)).status).toBe(404);
  });

  it("won't attach another user's note as a blocker", async () => {
    const note = await createNote(asAdmin());
    const task = await createTask(asMember());
    expect((await asMember().patch(`/api/tasks/${task.id}`, { blockerNoteId: note.id })).status).toBe(400);
  });
});

describe("project isolation", () => {
  it("keeps projects per-user", async () => {
    const res = await asAdmin().post("/api/projects", { name: "Admin's project" });
    expect(res.status).toBe(201);
    const projectId = res.body.id as string;

    expect((await asMember().get("/api/projects")).body).toEqual([]);
    expect((await asMember().patch(`/api/projects/${projectId}`, { name: "x" })).status).toBe(404);
    expect((await asMember().delete(`/api/projects/${projectId}`)).status).toBe(404);
    expect(
      (await asMember().post("/api/tasks", { description: "x", datePlanned: DAY, projectId })).status,
    ).toBe(400);
    expect((await asMember().post("/api/notes", { contextDate: DAY, projectId })).status).toBe(400);
    expect(
      (await asMember().patch("/api/calendar/events/evt1/project", { projectId })).status,
    ).toBe(400);
  });
});

describe("admin-only settings", () => {
  it("lets only admins change statuses, priority groups and users", async () => {
    expect((await asMember().post("/api/statuses", { statusCode: "X", ordinal: 9 })).status).toBe(403);
    expect((await asMember().patch(`/api/statuses/${ids.todo}`, { description: "x" })).status).toBe(403);
    expect((await asMember().delete(`/api/priority-groups/${ids.pgA}`)).status).toBe(403);
    expect(
      (
        await asMember().post("/api/users", {
          firstName: "E",
          lastName: "V",
          nickname: "eve",
          email: "eve@example.com",
        })
      ).status,
    ).toBe(403);
    expect((await asMember().patch(`/api/users/${ids.admin}`, { isAdmin: false })).status).toBe(403);

    expect((await asAdmin().post("/api/statuses", { statusCode: "X", ordinal: 9 })).status).toBe(201);
  });

  it("lets everyone read the shared statuses", async () => {
    expect((await asMember().get("/api/statuses")).body).toHaveLength(3);
  });

  it("hides other users' emails from non-admins", async () => {
    const res = await asMember().get("/api/users");
    expect(res.body).toHaveLength(2);
    expect(res.body[0].email).toBeUndefined();
    expect((await asAdmin().get("/api/users")).body[0].email).toBeDefined();
  });

  it("won't let an admin remove their own admin access", async () => {
    expect((await asAdmin().patch(`/api/users/${ids.admin}`, { isAdmin: false })).status).toBe(400);
  });
});

describe("password sign-in", () => {
  const PASSWORD = "correct horse battery";

  const login = (identifier: string, password: string) =>
    request(app).post("/api/auth/login").send({ identifier, password });

  async function inviteLink(as: ReturnType<typeof withToken>, userId: bigint) {
    const res = await as.post(`/api/users/${userId}/invite`);
    expect(res.status).toBe(200);
    return res.body.token as string;
  }

  it("rejects sign-in for an account that has no password yet", async () => {
    expect((await login("mel", PASSWORD)).status).toBe(401);
  });

  it("lets an invited user choose a password, then sign in with nickname or email", async () => {
    const token = await inviteLink(asAdmin(), ids.member);

    const preview = await request(app).get(`/api/auth/invite/${token}`);
    expect(preview.body).toEqual({ firstName: "Mel", nickname: "mel" });

    const accepted = await request(app).post(`/api/auth/invite/${token}`).send({ password: PASSWORD });
    expect(accepted.status).toBe(200);
    expect(accepted.body.token).toBeTruthy();

    expect((await login("mel", PASSWORD)).status).toBe(200);
    expect((await login("MEL@example.com", PASSWORD)).status).toBe(200);
    expect((await login("mel", "wrong password!")).status).toBe(401);
  });

  it("gives the same answer for an unknown user as for a wrong password", async () => {
    const unknown = await login("nobody", PASSWORD);
    const wrong = await login("ada", PASSWORD);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it("spends an invite link on first use", async () => {
    const token = await inviteLink(asAdmin(), ids.member);
    await request(app).post(`/api/auth/invite/${token}`).send({ password: PASSWORD });
    const again = await request(app).post(`/api/auth/invite/${token}`).send({ password: "another long password" });
    expect(again.status).toBe(404);
    expect((await request(app).get(`/api/auth/invite/${token}`)).status).toBe(404);
  });

  it("refuses an expired invite link", async () => {
    const token = await inviteLink(asAdmin(), ids.member);
    await prisma.user.update({ where: { id: ids.member }, data: { inviteExpiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get(`/api/auth/invite/${token}`)).status).toBe(404);
  });

  it("refuses a password that is too short", async () => {
    const token = await inviteLink(asAdmin(), ids.member);
    const res = await request(app).post(`/api/auth/invite/${token}`).send({ password: "short" });
    expect(res.status).toBe(400);
    expect((await request(app).get(`/api/auth/invite/${token}`)).status).toBe(200);
  });

  it("stores only a hash of the password and of the invite token", async () => {
    const token = await inviteLink(asAdmin(), ids.member);
    const pending = await prisma.user.findUnique({ where: { id: ids.member } });
    expect(pending?.inviteTokenHash).toBeTruthy();
    expect(pending?.inviteTokenHash).not.toBe(token);

    await request(app).post(`/api/auth/invite/${token}`).send({ password: PASSWORD });
    const user = await prisma.user.findUnique({ where: { id: ids.member } });
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user?.passwordHash).not.toContain(PASSWORD);
    expect(user?.inviteTokenHash).toBeNull();
  });

  it("only lets admins issue invite links", async () => {
    expect((await asMember().post(`/api/users/${ids.admin}/invite`)).status).toBe(403);
  });

  it("lets a user change their password only with the current one", async () => {
    await prisma.user.update({ where: { id: ids.member }, data: { passwordHash: await hashPassword(PASSWORD) } });

    const bad = await asMember().patch("/api/users/me/password", {
      currentPassword: "not the password",
      newPassword: "a brand new password",
    });
    expect(bad.status).toBe(400);

    const ok = await asMember().patch("/api/users/me/password", {
      currentPassword: PASSWORD,
      newPassword: "a brand new password",
    });
    expect(ok.status).toBe(204);
    expect((await login("mel", "a brand new password")).status).toBe(200);
    expect((await login("mel", PASSWORD)).status).toBe(401);
  });

  it("shows admins who can sign in yet", async () => {
    await prisma.user.update({ where: { id: ids.admin }, data: { passwordHash: await hashPassword(PASSWORD) } });
    await inviteLink(asAdmin(), ids.member);
    const users = (await asAdmin().get("/api/users")).body;
    const byNick = Object.fromEntries(users.map((u: { nickname: string }) => [u.nickname, u]));
    expect(byNick.ada).toMatchObject({ hasPassword: true, invitePending: false });
    expect(byNick.mel).toMatchObject({ hasPassword: false, invitePending: true });
    expect(JSON.stringify(users)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});
