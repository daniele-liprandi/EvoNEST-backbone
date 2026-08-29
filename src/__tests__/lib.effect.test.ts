/** @jest-environment node */

import { Effect, Layer, Schema } from "effect";
import { ObjectId } from "mongodb";
import {
  runRoute,
  ok,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  InternalError,
  ObjectIdHex,
  ObjectIdFromHex,
  decodeBody,
  Mongo,
  requireFound,
} from "@/lib/effect";
import { NextResponse } from "next/server";

const noMongo = Layer.succeed(Mongo, Mongo.of({ db: () => Effect.die("unused"), collection: () => Effect.die("unused") }));

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
    [new InternalError({ message: "boom" }), 500, "internal_error"],
  ])("maps %s to %d", async (error, status, code) => {
    const res = await runRoute(Effect.fail(error).pipe(Effect.provide(noMongo)) as any);
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.error.code).toBe(code);
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
