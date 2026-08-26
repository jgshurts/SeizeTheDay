import request from "supertest";
import { app } from "./app";

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("GET /api/auth/google/start", () => {
  it("redirects to Google's OAuth consent screen", async () => {
    const res = await request(app).get("/api/auth/google/start");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("accounts.google.com");
  });
});

describe("GET /api/auth/me", () => {
  it("rejects a request with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
