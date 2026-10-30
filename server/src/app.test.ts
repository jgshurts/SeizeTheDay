import request from "supertest";
import { app } from "./app";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("POST /api/auth/login", () => {
  it("requires both fields", async () => {
    const res = await request(app).post("/api/auth/login").send({ identifier: "ada" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("rejects a request with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
