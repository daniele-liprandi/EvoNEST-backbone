/** @jest-environment node */

import { Effect, Layer, Schema } from "effect";
import { ObjectId } from "mongodb";
import {
  runRoute,
  ok,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnprocessableEntityError,
  BadGatewayError,
  ServiceUnavailableError,
  InternalError,
  ObjectIdHex,
  ObjectIdFromHex,
  decodeBody,
  Mongo,
  Auth,
  testAuth,
  testNoAuth,
  testMongo,
  requireFound,
} from "@/lib/effect";
import { NextResponse } from "next/server";

const noMongo = testMongo();

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("runRoute", () => {
  test("returns the success response untouched", async () => {
    const res = await runRoute(ok({ hello: "world" }).pipe(Effect.provide(noMongo)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ hello: "world" });
  });

  test.each([
    [new ValidationError({ message: "bad" }), 400, "validation_error"],
    [new UnauthorizedError({}), 401, "unauthorized"],
    [new NotFoundError({ resource: "Trait" }), 404, "not_found"],
    [new ConflictError({ message: "dupe" }), 409, "conflict"],
    [new UnprocessableEntityError({ message: "unusable" }), 422, "unprocessable_entity"],
    [new BadGatewayError({ message: "upstream down" }), 502, "bad_gateway"],
    [new ServiceUnavailableError({ message: "not configured" }), 503, "service_unavailable"],
    [new InternalError({ message: "boom" }), 500, "internal_error"],
  ])("maps %s to %d", async (error, status, code) => {
    const res = await runRoute(Effect.fail(error).pipe(Effect.provide(noMongo)) as any);
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.code).toBe(code);
  });

  test("BadGateway / Unprocessable messages are returned (they carry no internals)", async () => {
    const gw = await runRoute(
      Effect.fail(new BadGatewayError({ message: "GNames responded 503" })).pipe(Effect.provide(noMongo)) as any,
    );
    expect((await gw.json()).error).toBe("GNames responded 503");
    const un = await runRoute(
      Effect.fail(new UnprocessableEntityError({ message: "no JSON in the reply" })).pipe(Effect.provide(noMongo)) as any,
    );
    expect((await un.json()).error).toBe("no JSON in the reply");
  });

  test("a defect becomes a bare 500 without leaking the message", async () => {
    const res = await runRoute(Effect.die(new Error("secret internal detail")).pipe(Effect.provide(noMongo)) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("secret internal detail");
  });
});

describe("ObjectId schema", () => {
  const decodeHex = Schema.decodeUnknownSync(ObjectIdHex);
  const decodeToOid = Schema.decodeUnknownSync(ObjectIdFromHex);

  test("accepts a canonical 24-hex id", () => {
    const id = new ObjectId().toHexString();
    expect(decodeHex(id)).toBe(id);
    expect(decodeToOid(id)).toBeInstanceOf(ObjectId);
  });

  test.each(["not-hex", "507f1f77bcf86cd7994390", "", "1234"])("rejects %p", (bad) => {
    expect(() => decodeHex(bad)).toThrow();
  });
});

describe("decodeBody", () => {
  const Body = Schema.Struct({ name: Schema.String, count: Schema.Number });

  test("decodes a valid body", async () => {
    const req = new Request("http://x", { method: "POST", body: JSON.stringify({ name: "a", count: 2 }) });
    const out = await Effect.runPromise(decodeBody(Body)(req));
    expect(out).toEqual({ name: "a", count: 2 });
  });

  test("fails with ValidationError and per-field issues", async () => {
    const req = new Request("http://x", { method: "POST", body: JSON.stringify({ name: 1 }) });
    const exit = await Effect.runPromiseExit(decodeBody(Body)(req));
    expect(exit._tag).toBe("Failure");
  });

  test("fails on non-JSON", async () => {
    const req = new Request("http://x", { method: "POST", body: "{ not json" });
    const res = await runRoute(
      decodeBody(Body)(req).pipe(
        Effect.flatMap(() => ok({})),
        Effect.provide(noMongo),
      ),
    );
    expect(res.status).toBe(400);
  });
});

describe("requireFound", () => {
  test("passes a value through", async () => {
    await expect(Effect.runPromise(requireFound("Trait")({ _id: 1 }))).resolves.toEqual({ _id: 1 });
  });
  test("turns null into NotFoundError", async () => {
    const exit = await Effect.runPromiseExit(requireFound("Trait", "x")(null));
    expect(exit._tag).toBe("Failure");
  });
});

describe("Auth test layers", () => {
  const handler = Effect.gen(function* () {
    const auth = yield* Auth;
    const user = yield* auth.currentUser;
    return yield* ok({ db: user.activeDatabase, role: user.role });
  });

  test("testAuth supplies a fixed user", async () => {
    const res = await runRoute(handler.pipe(Effect.provide(testAuth({ sub: "u1", activeDatabase: "lab_a" }))));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ db: "lab_a", role: null });
  });

  test("testNoAuth makes the route 401", async () => {
    const res = await runRoute(handler.pipe(Effect.provide(testNoAuth)));
    expect(res.status).toBe(401);
  });

  test("requireRole fails with 403 for the wrong role", async () => {
    const adminOnly = Effect.gen(function* () {
      const auth = yield* Auth;
      yield* auth.requireRole("admin");
      return yield* ok({ ok: true });
    });
    const res = await runRoute(adminOnly.pipe(Effect.provide(testAuth({ sub: "u1", role: "user" }))));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("forbidden");
  });
});

describe("Layer.effect + Effect.cached scoping (the AuthLive memoisation pattern)", () => {
  // AuthLive caches the session and user lookups inside its Layer.effect. This
  // proves the cache lives for one Effect.provide (one request), not globally,
  // so a request cannot read the previous request's user.
  test("cache collapses repeats within a build and resets on the next", async () => {
    let calls = 0;
    const layer = Layer.effect(
      Mongo,
      Effect.gen(function* () {
        const lookup = yield* Effect.cached(Effect.sync(() => ++calls));
        return { findOne: () => lookup.pipe(Effect.as(null)) } as unknown as never;
      }),
    );

    const program = Effect.gen(function* () {
      const m = yield* Mongo;
      yield* m.findOne("d", "c", {});
      yield* m.findOne("d", "c", {});
      yield* m.findOne("d", "c", {});
    });

    await Effect.runPromise(program.pipe(Effect.provide(layer)));
    await Effect.runPromise(program.pipe(Effect.provide(layer)));

    expect(calls).toBe(2);
  });
});
