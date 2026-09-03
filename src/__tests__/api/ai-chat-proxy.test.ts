/** @jest-environment node */

import { Effect } from "effect";
import { runRoute, testAuth, testNoAuth } from "@/lib/effect";
import { proxyChat } from "@/app/api/ai/chat/handlers";

const authed = testAuth({ sub: "auth0|alice", name: "alice", activeDatabase: "testdb" });

const req = (body: unknown) =>
  new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const ENV = { ...process.env };
beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...ENV };
});

describe("POST /api/ai/chat", () => {
  test("401 when not authenticated", async () => {
    const res = await runRoute(proxyChat(req({ message: "hi", threadId: "t" })).pipe(Effect.provide(testNoAuth)));
    expect(res.status).toBe(401);
  });

  test("400 when message is missing", async () => {
    const res = await runRoute(proxyChat(req({ threadId: "t" })).pipe(Effect.provide(authed)));
    expect(res.status).toBe(400);
  });

  test("503 when the service secret is not configured", async () => {
    delete process.env.MASTRA_SERVICE_SECRET;
    const res = await runRoute(proxyChat(req({ message: "hi", threadId: "t" })).pipe(Effect.provide(authed)));
    expect(res.status).toBe(503);
  });

  test("forwards to the mastra service with the service key and db name", async () => {
    process.env.MASTRA_SERVICE_SECRET = "secret-123";
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ blocks: [] }), { status: 200 }));

    const res = await runRoute(proxyChat(req({ message: "hi", threadId: "t" })).pipe(Effect.provide(authed)));
    expect(res.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>)["x-service-key"]).toBe("secret-123");
    expect(JSON.parse(init?.body as string)).toMatchObject({ message: "hi", threadId: "t", dbName: "testdb" });
  });

  test("an unreachable service is a graceful 200 message, not an error", async () => {
    process.env.MASTRA_SERVICE_SECRET = "secret-123";
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await runRoute(proxyChat(req({ message: "hi", threadId: "t" })).pipe(Effect.provide(authed)));
    expect(res.status).toBe(200);
    expect((await res.json()).blocks[0].content).toMatch(/Could not reach/);
  });

  test("a mastra error status becomes a 502", async () => {
    process.env.MASTRA_SERVICE_SECRET = "secret-123";
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "x" }), { status: 500 }));
    const res = await runRoute(proxyChat(req({ message: "hi", threadId: "t" })).pipe(Effect.provide(authed)));
    expect(res.status).toBe(502);
  });
});
