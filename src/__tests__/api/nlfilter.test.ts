/** @jest-environment node */

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/options", () => ({ authOptions: {} }));

const { getServerSession } = require("next-auth");
import { POST } from "@/app/api/nlfilter/route";

const realFetch = global.fetch;
const ENV = { ...process.env };

const llmReply = (content: string) =>
  ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) }) as Response;

const body = (obj: unknown) =>
  new Request("http://x/api/nlfilter", { method: "POST", body: JSON.stringify(obj) });

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  getServerSession.mockResolvedValue({ user: { sub: "u1" } });
  process.env.LLM_BASE_URL = "https://llm.test";
  process.env.LLM_AUTH_TOKEN = "t";
  process.env.LLM_MODEL = "m";
});
afterEach(() => {
  global.fetch = realFetch;
  process.env = { ...ENV };
  jest.restoreAllMocks();
});

describe("POST /api/nlfilter", () => {
  test("401 without a session or service key", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(body({ query: "x" }))).status).toBe(401);
  });

  test("400 when query is missing", async () => {
    expect((await POST(body({ columns: ["name"] }))).status).toBe(400);
  });

  test("503 when the LLM is not configured", async () => {
    delete process.env.LLM_MODEL;
    expect((await POST(body({ query: "silk in pw01", columns: ["box"] }))).status).toBe(503);
  });

  test("page mode returns { params } parsed from the model reply", async () => {
    global.fetch = jest.fn().mockResolvedValue(llmReply('{"box":"pw01","type":"silk"}')) as any;
    const res = await POST(body({ query: "silk in pw01", columns: ["box", "type"] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ params: { box: "pw01", type: "silk" } });
  });

  test("global mode returns { route, params }", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(llmReply('<think>hmm</think>{"route":"/traits","params":{"type":"diameter"}}')) as any;
    const res = await POST(
      body({ query: "diameter traits", routes: [{ label: "traits", path: "/traits", columns: ["type"] }] }),
    );
    await expect(res.json()).resolves.toEqual({ route: "/traits", params: { type: "diameter" } });
  });

  test("502 when the LLM request fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "boom" }) as any;
    expect((await POST(body({ query: "x", columns: [] }))).status).toBe(502);
  });

  test("422 when the model reply has no JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue(llmReply("I cannot help with that")) as any;
    expect((await POST(body({ query: "x", columns: [] }))).status).toBe(422);
  });
});
