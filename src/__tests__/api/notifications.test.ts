/** @jest-environment node */

// The route keeps an in-memory cache as a module-level variable, so each test
// needs a fresh module instance (jest.resetModules + a fresh require) — a
// statically-imported GET would share that cache across every test below.

const originalFetch = global.fetch;
const originalEnv = process.env.NOTIFICATIONS_URL;

let GET: typeof import("@/app/api/notifications/route").GET;

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  delete process.env.NOTIFICATIONS_URL;
  ({ GET } = require("@/app/api/notifications/route"));
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalEnv === undefined) delete process.env.NOTIFICATIONS_URL;
  else process.env.NOTIFICATIONS_URL = originalEnv;
});

const mockFetchOk = (payload: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  }) as unknown as typeof fetch;
};

describe("GET /api/notifications", () => {
  test("sets a Cache-Control header on a fresh response", async () => {
    mockFetchOk([{ id: "a", date: "2026-01-01T00:00:00Z", title: "Hi", body: "x", level: "info" }]);
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toMatch(/max-age=150/);
  });

  test("normalizes the legacy { name, description, time } shape", async () => {
    mockFetchOk([{ name: "Legacy title", description: "legacy body", time: "241204-18:30", icon: "💬", color: "#fff" }]);
    const res = await GET();
    const data = await res.json();
    expect(data[0]).toMatchObject({
      title: "Legacy title",
      body: "legacy body",
      level: "info",
      icon: "💬",
      color: "#fff",
    });
    expect(data[0].id).toBeTruthy();
    expect(new Date(data[0].date).toISOString()).toBe(data[0].date);
  });

  test("passes through the current schema unchanged (aside from defaults)", async () => {
    mockFetchOk([{ id: "release-1", date: "2026-02-01T00:00:00Z", title: "Release", body: "notes", level: "warning", link: "https://x" }]);
    const res = await GET();
    const data = await res.json();
    expect(data[0]).toEqual({
      id: "release-1",
      date: "2026-02-01T00:00:00Z",
      title: "Release",
      body: "notes",
      level: "warning",
      link: "https://x",
      icon: null,
      color: null,
    });
  });

  test("derives the same id twice from the same title+date", async () => {
    mockFetchOk([{ title: "Same title", date: "2026-01-01T00:00:00Z", body: "x", level: "info" }]);
    const first = await (await GET()).json();

    jest.resetModules();
    ({ GET } = require("@/app/api/notifications/route"));
    mockFetchOk([{ title: "Same title", date: "2026-01-01T00:00:00Z", body: "y", level: "info" }]);
    const second = await (await GET()).json();

    expect(first[0].id).toBe(second[0].id);
  });

  test("respects NOTIFICATIONS_URL override", async () => {
    process.env.NOTIFICATIONS_URL = "https://example.test/feed.json";
    mockFetchOk([]);
    await GET();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/feed.json",
      expect.objectContaining({ next: { revalidate: 150 } })
    );
  });

  test("hides an item whose minVersion is above the running app version", async () => {
    mockFetchOk([
      { id: "future", date: "2026-01-01T00:00:00Z", title: "Future feature", body: "x", level: "info", minVersion: "999.0.0" },
      { id: "now", date: "2026-01-01T00:00:00Z", title: "Current", body: "x", level: "info" },
    ]);
    const data = await (await GET()).json();
    expect(data.map((n: { id: string }) => n.id)).toEqual(["now"]);
  });

  test("falls back to the local file (still normalized) when the fetch fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const res = await GET();
    expect(res.status).toBe(206);
    const data = await res.json();
    expect(Array.isArray(data.notifications)).toBe(true);
    expect(data.notifications[0]).toHaveProperty("id");
    expect(data.notifications[0]).toHaveProperty("date");
  });
});
