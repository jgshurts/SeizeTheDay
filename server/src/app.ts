import "./lib/bigint-json";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";
import { notesRouter } from "./routes/notes";
import { statusesRouter } from "./routes/statuses";
import { priorityGroupsRouter } from "./routes/priorityGroups";
import { usersRouter } from "./routes/users";
import { projectsRouter } from "./routes/projects";
import { calendarRouter } from "./routes/calendar";

export const app = express();

// Behind a load balancer every request appears to come from the proxy, which
// would make the login rate limit shared by everyone. Set TRUST_PROXY to the
// number of proxies in front of the app (1 for a single ALB) so the real
// client IP is used. Left unset, X-Forwarded-For is ignored, which is right
// when clients connect directly (it can't be spoofed to dodge the limit).
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY));

app.use(cors());
// Raised from Express's 100kb default -- theme background images are sent
// as base64 data URLs, which run noticeably bigger than the raw file.
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/notes", notesRouter);
app.use("/api/statuses", statusesRouter);
app.use("/api/priority-groups", priorityGroupsRouter);
app.use("/api/users", usersRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/calendar", calendarRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
