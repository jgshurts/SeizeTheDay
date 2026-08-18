import { Router } from "express";
import { prisma } from "../lib/prisma";

export const lookupsRouter = Router();

lookupsRouter.get("/projects", async (_req, res) => {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });
  res.json(projects);
});

lookupsRouter.get("/statuses", async (_req, res) => {
  const statuses = await prisma.status.findMany({ orderBy: { prty: "asc" } });
  res.json(statuses);
});

lookupsRouter.get("/priority-groups", async (_req, res) => {
  const priorityGroups = await prisma.priorityGroup.findMany({ orderBy: { prty: "asc" } });
  res.json(priorityGroups);
});
