/** @jest-environment node */

import { runRoute } from "@/lib/effect";

const load = async () => (await import("@/app/api/notifications/route")).getNotifications;

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("GET /api/notifications", () => {
  test("returns the feed and caches it", async () => {
    const feed = [{ id: "n1", title: "Release 2.0" }];
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify(feed), { status: 200 }));

    const getNotifications = await load();
    const first = await runRoute(getNotifications);
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual(feed);

    const second = await runRoute(getNotifications);
    expect(second.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("206 with a warning when the feed is unreachable and there is no cache", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const getNotifications = await load();
    const res = await runRoute(getNotifications);
    expect(res.status).toBe(206);
    const body = await res.json();
    expect(body.warning).toMatch(/fallback/i);
    expect(body.notifications).toBeDefined();
  });
});
