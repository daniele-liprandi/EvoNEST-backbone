# Effect conventions

Server-side async in EvoNEST is moving to [Effect](https://effect.website). New API routes and services are written with it; existing ones migrate area by area. This page is the contract.

## Why

- Errors live in the type. A handler's signature says exactly which failures it can produce, and the compiler stops you from forgetting one.
- One place decides how an error becomes an HTTP response, so status codes and body shape stay consistent.
- Dependencies (the database, the session) are declared, not imported, so tests swap them without mocking modules.

## The building blocks

Everything is in `src/lib/effect`.

### Tagged errors (`errors.ts`)

`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `InternalError`. A route Effect's error channel is a union of these. Anything else that throws is a defect and becomes a bare 500 with nothing leaked.

```ts
Effect.fail(new NotFoundError({ resource: "Trait", id }))
Effect.fail(new ValidationError({ message: "measurement must be positive" }))
```

### The route adapter (`http.ts`)

`runRoute` runs a route Effect and returns a `Response`. It maps each tagged error to its status, provides the live database layer, and logs defects.

| Error | Status | Body `code` |
|-------|--------|-------------|
| ValidationError | 400 | `validation_error` (+ `issues`) |
| UnauthorizedError | 401 | `unauthorized` |
| ForbiddenError | 403 | `forbidden` |
| NotFoundError | 404 | `not_found` |
| ConflictError | 409 | `conflict` |
| InternalError / defect | 500 | `internal_error` |

Error body shape: `{ "error": "message", "code": "not_found", "issues"?: [...] }`. `error` is kept flat so existing `result.error` reads on the client keep working; `code` is the stable machine-readable value.

### The auth service (`auth.ts`)

Depend on `Auth`, not on `getServerSession` / `get_database_user` / `check_user_role`. `runRoute` supplies it.

```ts
Effect.gen(function* () {
  const auth = yield* Auth
  const dbName = yield* auth.databaseName      // 401 if no session
  const user = yield* auth.requireRole("admin") // 401 or 403
})
```

`session`, `currentUser`, `databaseName`, `requireRole(role)`. Tests use `testAuth({ sub, role, activeDatabase })` or `testNoAuth`.

### The database service (`db.ts`)

Depend on `Mongo`, not on `get_or_create_client`. `runRoute` supplies `MongoLive`.

```ts
Effect.gen(function* () {
  const mongo = yield* Mongo
  const doc = yield* mongo.findOne(dbName, "traits", { _id: id })
  yield* requireFound("Trait", id.toHexString())(doc)
  yield* mongo.updateOne(dbName, "traits", { _id: id }, { $set: { note } })
})
```

- `findOne`, `find`, `insertOne`, `updateOne`, `deleteOne` each run the driver call and turn a rejection into `InternalError`. Use these rather than the raw `collection`.
- `collection(dbName, name)` is the escape hatch for operations the service does not wrap; pair it with `attempt(fn, label)`.
- `requireFound(resource, id)` turns a `null` lookup into `NotFoundError`.

### Validation (`schema.ts`, `request.ts`)

`decodeBody(schema)(request)` and `decodeSearchParams(schema)(request)` parse and fail with `ValidationError` carrying per-field issues. `ObjectIdHex` and `ObjectIdFromHex` handle ids.

> Schema library: `effect/Schema` everywhere. zod is being removed, including the mastra tool schemas (wrapped with `Schema.standardSchemaV1`). New code must not add zod.

## Writing a route

```ts
// src/app/api/traits/route.ts
import { Effect, Schema } from "effect"
import { NextResponse } from "next/server"
import { runRoute, ok, decodeBody, ObjectIdFromHex, Auth, Mongo, attempt, requireFound } from "@/lib/effect"

const DeleteBody = Schema.Struct({ id: ObjectIdFromHex })

export function DELETE(request: Request) {
  return runRoute(
    Effect.gen(function* () {
      const { id } = yield* decodeBody(DeleteBody)(request)
      const auth = yield* Auth
      const dbName = yield* auth.databaseName
      const mongo = yield* Mongo
      const traits = yield* mongo.collection(dbName, "traits")

      const result = yield* attempt(() => traits.deleteOne({ _id: id }), "traits.deleteOne")
      yield* requireFound("Trait", id.toHexString())(result.deletedCount > 0 ? result : null)

      return yield* ok({ message: "Trait deleted" })
    }),
  )
}
```

The handler never touches a status code or a try/catch. Every failure path is a typed `Effect.fail`.

## Testing

Run the exported Effect with stub layers.

```ts
const mongo = testMongo({
  findOne: () => Effect.succeed({ _id: id }),
  deleteOne: () => Effect.succeed({ deletedCount: 1 } as never),
})

const res = await runRoute(
  deleteTrait(request).pipe(Effect.provide(Layer.merge(mongo, testAuth({ sub: "u1" })))),
)
expect(res.status).toBe(200)
```

`testMongo()` stubs every method to reject; override only what the test hits. `testAuth({ sub, role })` and `testNoAuth` do the same for `Auth`.

## Migrating

- One area per branch and PR: `samples`, `traits`, `experiments`, `files`, `user`. Track against the epic issue.
- Convert whole route files, not single handlers, so a file is not half Effect and half try/catch.
- Do not rework a recent bug-fix PR to Effect; it migrates with its area.
- A route with no async and no failure modes does not need Effect.
