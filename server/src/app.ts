import "./lib/bigint-json";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";
import { notesRouter } from "./routes/notes";
import { lookupsRouter } from "./routes/lookups";
import { statusesRouter } from "./routes/statuses";
import { priorityGroupsRouter } from "./routes/priorityGroups";
import { usersRouter } from "./routes/users";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/notes", notesRouter);
app.use("/api/statuses", statusesRouter);
app.use("/api/priority-groups", priorityGroupsRouter);
app.use("/api/users", usersRouter);
app.use("/api", lookupsRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
