/** @jest-environment node */

import { Effect } from "effect";
import { runRoute } from "@/lib/effect";
import { searchGbifImage } from "@/app/api/searchGBIFImage/route";

const req = (qs: string) => new Request(`http://x/api/searchGBIFImage${qs}`);

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/searchGBIFImage", () => {
  test("returns the first still image", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { media: [{ type: "MovingImage", identifier: "no" }] },
            { media: [{ type: "StillImage", identifier: "http://img/1.jpg" }], rightsHolder: "Ada", country: "DE" },
          ],
        }),
        { status: 200 },
      ),
    );
    const res = await runRoute(searchGbifImage(req("?query=Araneus")));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      imageUrl: "http://img/1.jpg",
      rightsHolder: "Ada",
      country: "DE",
    });
  });

  test("400 when query is missing", async () => {
    const res = await runRoute(searchGbifImage(req("")));
    expect(res.status).toBe(400);
  });

  test("404 when no result has a still image", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ results: [{ media: [] }] }), { status: 200 }),
    );
    const res = await runRoute(searchGbifImage(req("?query=x")));
    expect(res.status).toBe(404);
  });

  test("500 when GBIF errors, without leaking details", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.gbif.org"));
    const res = await runRoute(searchGbifImage(req("?query=x")));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("ENOTFOUND");
  });
});
