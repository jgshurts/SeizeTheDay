import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { requireAuth } from "./middleware/requireAuth";
import { SESSION_DAYS, signToken, verifyToken } from "./lib/auth";

describe("session token", () => {
  it("expires after SESSION_DAYS", () => {
    const token = signToken({ userId: "1", nickname: "ada" });
    const { iat, exp } = jwt.decode(token) as { iat: number; exp: number };
    expect(exp - iat).toBe(SESSION_DAYS * 24 * 60 * 60);
    expect(verifyToken(token).userId).toBe("1");
  });

  it("is refused once expired", () => {
    const secret = process.env.JWT_SECRET ?? "dev-only-secret-change-me";
    const old = jwt.sign({ userId: "1", nickname: "ada" }, secret, { expiresIn: -1 });
    expect(() => verifyToken(old)).toThrow();
  });

  describe("sliding renewal", () => {
    const secret = process.env.JWT_SECRET ?? "dev-only-secret-change-me";
    const probe = express();
    probe.get("/ping", requireAuth, (_req, res) => res.json({ ok: true }));
    const tokenIssued = (hoursAgo: number) =>
      jwt.sign({ userId: "1", nickname: "ada", iat: Math.floor(Date.now() / 1000) - hoursAgo * 3600 }, secret, {
        expiresIn: "3d",
      });

    it("leaves a recent token alone", async () => {
      const res = await request(probe).get("/ping").set("Authorization", `Bearer ${tokenIssued(1)}`);
      expect(res.status).toBe(200);
      expect(res.headers["x-refreshed-token"]).toBeUndefined();
    });

    it("sends a fresh token once the current one is old enough", async () => {
      const res = await request(probe).get("/ping").set("Authorization", `Bearer ${tokenIssued(30)}`);
      expect(res.status).toBe(200);
      const fresh = res.headers["x-refreshed-token"];
      expect(verifyToken(fresh).userId).toBe("1");
      const { iat, exp } = jwt.decode(fresh) as { iat: number; exp: number };
      expect(exp - iat).toBe(SESSION_DAYS * 24 * 60 * 60);
    });
  });
});
