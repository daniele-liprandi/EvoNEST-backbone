/** @jest-environment node */

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/options", () => ({ authOptions: {} }));
jest.mock("@/app/api/utils/verifyServiceKey", () => ({ isServiceRequest: () => true }));

import { POST } from "@/app/api/checknames/route";

const realFetch = global.fetch;

function gnamesResponse(bestResult: unknown) {
  return {
    ok: true,
    json: async () => ({ names: [bestResult ? { bestResult } : {}] }),
  } as Response;
}

const body = (obj: unknown) =>
  new Request("http://x/api/checknames", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe("POST /api/checknames", () => {
  test("missing taxa is a 400", async () => {
    const res = await POST(body({}));
    expect(res.status).toBe(400);
  });

  test("a recognised name returns the canonical form", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      gnamesResponse({
        currentCanonicalSimple: "Araneus diadematus",
        classificationPath: "Animalia|Arthropoda|Arachnida|Araneae|Araneidae|Araneus|Araneus diadematus",
        classificationRanks: "kingdom|phylum|class|order|family|genus|species",
      }),
    ) as any;
    const res = await POST(body({ taxa: "araneus diadematus" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("success");
    expect(json.data).toBe("Araneus diadematus");
  });

  test("fullTaxaInfo returns the hierarchy", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      gnamesResponse({
        currentCanonicalSimple: "Araneus diadematus",
        classificationPath: "Animalia|Araneidae|Araneus|Araneus diadematus",
        classificationRanks: "kingdom|family|genus|species",
      }),
    ) as any;
    const res = await POST(body({ taxa: "Araneus diadematus", method: "fullTaxaInfo" }));
    const json = await res.json();
    expect(json.data.family).toBe("Araneidae");
    expect(json.data.genus).toBe("Araneus");
    expect(json.data.species).toBe("diadematus");
  });

  test("an unrecognised name is 200 with suggestions, not an error", async () => {
    global.fetch = jest.fn().mockResolvedValue(gnamesResponse(null)) as any;
    const res = await POST(body({ taxa: "notareal genus" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("unrecognised");
    expect(json.suggestions).toEqual(["Notareal sp.", "Notareal genus"]);
  });

  test("GNames unreachable is a 502", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as any;
    const res = await POST(body({ taxa: "Araneus diadematus" }));
    expect(res.status).toBe(502);
  });
});
