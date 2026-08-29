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

Error body shape: `{ "error": { "code": "...", "message": "...", "issues"?: [...] } }`.

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
  const traits = yield* mongo.collection(dbName, "traits")
  const result = yield* attempt(() => traits.deleteOne({ _id: id }), "traits.deleteOne")
  // ...
})
```

- `attempt(op, context)` wraps a driver call, turning a rejection into `InternalError`.
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

Run the handler's Effect, or the whole route, with stub layers.

```ts
const traits = { deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }) }
const TestMongo = Layer.succeed(Mongo, Mongo.of({
  db: () => Effect.die("unused"),
  collection: () => Effect.succeed(traits as any),
}))

const res = await runRoute(handler(request).pipe(Effect.provide(TestMongo)))
expect(res.status).toBe(200)
```

## Migrating

- One area per branch and PR: `samples`, `traits`, `experiments`, `files`, `user`. Track against the epic issue.
- Convert whole route files, not single handlers, so a file is not half Effect and half try/catch.
- Do not rework a recent bug-fix PR to Effect; it migrates with its area.
- A route with no async and no failure modes does not need Effect.
