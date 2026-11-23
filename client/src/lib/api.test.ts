import { api, getToken, page, setToken } from "./api";

describe("401 handling", () => {
  const reload = jest.spyOn(page, "reload").mockImplementation(() => {});

  beforeEach(() => {
    localStorage.clear();
    reload.mockClear();
  });

  function mockFetch(status: number, onCall?: () => void) {
    globalThis.fetch = jest.fn(async () => {
      onCall?.();
      // jsdom has no Response, so hand back just what api.ts reads.
      return {
        ok: false,
        status,
        statusText: "",
        headers: { get: () => null },
        json: async () => ({ error: "nope" }),
      };
    }) as unknown as typeof fetch;
  }

  it("clears the token and reloads when the stored token is rejected", async () => {
    setToken("old");
    mockFetch(401);
    await expect(api.get("/tasks")).rejects.toThrow();
    expect(getToken()).toBeNull();
    expect(reload).toHaveBeenCalled();
  });

  it("keeps a newer token when a stale request is rejected", async () => {
    setToken("old");
    mockFetch(401, () => setToken("new")); // a login lands while the request is in flight
    await expect(api.get("/tasks")).rejects.toThrow();
    expect(getToken()).toBe("new");
    expect(reload).not.toHaveBeenCalled();
  });
});
