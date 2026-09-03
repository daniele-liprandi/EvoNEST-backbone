/** @jest-environment node */

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/options", () => ({ authOptions: {} }));

const { getServerSession } = require("next-auth");
import { POST } from "@/app/api/checknames/route";

const realFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  delete process.env.MASTRA_SERVICE_SECRET;
});
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/checknames", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ taxa: "Araneus diadematus" }),
  });

describe("POST /api/checknames auth", () => {
  test("401 without a session or service key", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(req())).status).toBe(401);
  });

  test("a wrong service key is rejected", async () => {
    getServerSession.mockResolvedValue(null);
    process.env.MASTRA_SERVICE_SECRET = "right";
    expect((await POST(req({ "x-service-key": "wrong" }))).status).toBe(401);
  });

  test("the correct service key is accepted (no session needed)", async () => {
    getServerSession.mockResolvedValue(null);
    process.env.MASTRA_SERVICE_SECRET = "right";
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ names: [{}] }) }) as unknown as typeof fetch;
    const res = await POST(req({ "x-service-key": "right" }));
    expect(res.status).toBe(200);
  });
});
