/** @jest-environment node */

import { Effect } from "effect";
import { runRoute, testAuth, testNoAuth } from "@/lib/effect";
import { geocodeLocation } from "@/app/api/geocoding/handlers";

const req = (body: unknown) =>
  new Request("http://x/api/geocoding", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("POST /api/geocoding", () => {
  test("returns the first Nominatim hit", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ lat: "40.1", lon: "9.1", display_name: "Nuoro" }]), { status: 200 }),
    );
    const res = await runRoute(
      geocodeLocation(req({ location: "Nuoro" })).pipe(Effect.provide(testAuth({ sub: "u1" }))),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.coordinates).toMatchObject({ lat: "40.1", lon: "9.1" });
    expect(body.attribution).toContain("Nominatim");
  });

  test("401 without a session", async () => {
    const res = await runRoute(
      geocodeLocation(req({ location: "x" })).pipe(Effect.provide(testNoAuth)),
    );
    expect(res.status).toBe(401);
  });

  test("400 for a missing location", async () => {
    const res = await runRoute(
      geocodeLocation(req({})).pipe(Effect.provide(testAuth({ sub: "u1" }))),
    );
    expect(res.status).toBe(400);
  });

  test("404 when Nominatim has no match", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("[]", { status: 200 }));
    const res = await runRoute(
      geocodeLocation(req({ location: "nowhere" })).pipe(Effect.provide(testAuth({ sub: "u1" }))),
    );
    expect(res.status).toBe(404);
  });

  test("500 when Nominatim errors, without leaking details", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("getaddrinfo ENOTFOUND nominatim.openstreetmap.org"));
    const res = await runRoute(
      geocodeLocation(req({ location: "x" })).pipe(Effect.provide(testAuth({ sub: "u1" }))),
    );
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("ENOTFOUND");
  });
});
