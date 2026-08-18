import { Router } from "express";
import { prisma } from "../lib/prisma";

export const lookupsRouter = Router();

lookupsRouter.get("/projects", async (_req, res) => {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });
  res.json(projects);
});
