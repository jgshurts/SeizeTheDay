import { Prisma } from "@prisma/client";
import { Response } from "express";

// Shared handling for the Prisma error codes CRUD routes commonly hit:
// unique constraint violations, missing rows, and FK restrictions on delete.
export function handlePrismaError(err: unknown, res: Response): void {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A record with that value already exists" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (err.code === "P2003") {
      res.status(409).json({ error: "This record is still referenced by other data" });
      return;
    }
  }
  throw err;
}
