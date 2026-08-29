/** @jest-environment node */

import { Effect } from "effect";
import { runRoute, testAuth, testNoAuth } from "@/lib/effect";
import { reverseGeocode } from "@/app/api/reversegeo/route";

const req = (body: unknown) =>
  new Request("http://x/api/reversegeo", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("POST /api/reversegeo", () => {
  test("returns the address for coordinates", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ address: { city: "Berlin", country: "Deutschland" } }), { status: 200 }),
    );
    const res = await runRoute(
      reverseGeocode(req({ lat: 52.52, lon: 13.4 })).pipe(Effect.provide(testAuth({ sub: "u1" }))),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.location).toMatchObject({ city: "Berlin" });
  });

  test("401 without a session", async () => {
    const res = await runRoute(
      reverseGeocode(req({ lat: 1, lon: 2 })).pipe(Effect.provide(testNoAuth)),
    );
    expect(res.status).toBe(401);
  });

  test("400 for a missing coordinate", async () => {
    const res = await runRoute(
      reverseGeocode(req({ lat: 1 })).pipe(Effect.provide(testAuth({ sub: "u1" }))),
    );
    expect(res.status).toBe(400);
  });

  test("404 when Nominatim has no address", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const res = await runRoute(
      reverseGeocode(req({ lat: 0, lon: 0 })).pipe(Effect.provide(testAuth({ sub: "u1" }))),
    );
    expect(res.status).toBe(404);
  });

  test("500 when Nominatim errors, without leaking details", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("getaddrinfo ENOTFOUND nominatim.openstreetmap.org"));
    const res = await runRoute(
      reverseGeocode(req({ lat: 0, lon: 0 })).pipe(Effect.provide(testAuth({ sub: "u1" }))),
    );
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("ENOTFOUND");
  });
});
