# Effect conventions

Server-side async in EvoNEST is moving to [Effect](https://effect.website). New API routes and services are written with it; existing ones migrate area by area. This page is the contract.

## Why

- Errors live in the type. A handler's signature says exactly which failures it can produce, and the compiler stops you from forgetting one.
- One place decides how an error becomes an HTTP response, so status codes and body shape stay consistent.
- Dependencies (the database, the session) are declared, not imported, so tests swap them without mocking modules.

## The building blocks

Everything is in `src/lib/effect`.

### Tagged errors (`errors.ts`)

`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableEntityError`, `BadGatewayError`, `ServiceUnavailableError`, `InternalError`. A route Effect's error channel is a union of these. Anything else that throws is a defect and becomes a bare 500 with nothing leaked.

Reach for `BadGatewayError` when an upstream service (GNames, an LLM endpoint, Nominatim, the Mastra service) is unreachable or answers with an error; `ServiceUnavailableError` when such a dependency is not configured; `UnprocessableEntityError` when it answers with content this route cannot use. Their messages *are* returned — keep them free of internals.

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
| UnprocessableEntityError | 422 | `unprocessable_entity` |
| BadGatewayError | 502 | `bad_gateway` |
| ServiceUnavailableError | 503 | `service_unavailable` |
| InternalError / defect | 500 | `internal_error` |

Error body shape: `{ "error": "message", "code": "not_found", "issues"?: [...] }`. `error` is kept flat so existing `result.error` reads on the client keep working; `code` is the stable machine-readable value.

### Auth (`auth.ts`)

Never call `getServerSession` / `get_database_user` / `check_user_role`. Use these accessors; `runRoute` supplies the service.

```ts
const dbName = yield* currentDatabase       // 401 if no session
const user = yield* currentUser             // the user record
yield* requireRole("admin")                 // 401 or 403
```

Also `currentSession`. Tests use `testAuth({ sub, role, activeDatabase })` or `testNoAuth`.

### Database (`db.ts`)

Never call `get_or_create_client`. `const mongo = yield* Mongo`, then:

```ts
const doc = yield* mongo.findOne(dbName, "traits", { _id: id })
yield* mongo.updateOne(dbName, "traits", { _id: id }, { $set: { note } })
```

- `findOne`, `find`, `insertOne`, `updateOne`, `deleteOne` run the driver call and map a rejection to `InternalError`.
- `collection(dbName, name)` is the escape hatch (aggregation, `insertMany`, projections); pair it with `attempt(fn, label)`.
- `requireFound(resource, id)` turns a `null` into `NotFoundError`.
- `sampleChain(dbName, id)` (in `api/utils/sampleChain`) walks a sample's parent chain — use it, don't reimplement it.

### Validation (`schema.ts`, `request.ts`)

`decodeBody(schema)(request)` and `decodeSearchParams(schema)(request)` parse and fail with `ValidationError` carrying per-field issues. `ObjectIdHex` and `ObjectIdFromHex` handle ids.

> Schema library on the server: `effect/Schema`. Every API route, service and request/response type validates with it — new server code must not add zod.
>
> zod stays at the edges, where the ecosystem expects it and `effect/Schema` would only add an adapter and a conversion hop:
> - **Mastra tool `inputSchema` / `outputSchema`** (`mastra/src/tools/*`). `@mastra/core` accepts Standard Schema, but `effect/Schema`'s `standardSchemaV1` omits the JSON-Schema half Mastra needs, and provider strict-mode compat round-trips through zod regardless. The tool `execute` bodies are still Effect.
> - **The shared AI block schemas** (`mastra/src/types.ts`, `src/lib/ai-types.ts`) — `z.infer` types consumed by the chat renderer.
> - **react-hook-form schemas** (`src/components/forms/*`, and form-bearing pages) via `zodResolver`.

## The route template

Every route file follows the same shape. Deviating from it is a review comment.

```ts
// src/app/api/traits/route.ts
import { Effect, Schema } from "effect"
import { ObjectId } from "mongodb"
import { runRoute, ok, decodeBody, currentDatabase, Mongo, requireFound, ObjectIdFromHex } from "@/lib/effect"

/**
 * @swagger
 * /api/traits: { ... minimal, accurate annotation ... }
 */

const DeleteBody = Schema.Struct({ id: ObjectIdFromHex })

export const deleteTrait = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase
    const { id } = yield* decodeBody(DeleteBody)(request)
    const mongo = yield* Mongo

    const result = yield* mongo.deleteOne(dbName, "traits", { _id: id })
    yield* requireFound("Trait")(result.deletedCount > 0 ? result : null)
    return yield* ok({ message: "Trait deleted" })
  })

export const DELETE = (request: Request) => runRoute(deleteTrait(request))
```

Rules:

- **One `Effect.gen` per operation**, `export`ed, named `<verb><Noun>` (`listTraits`, `createTrait`, `deleteTrait`). A method-dispatch POST is `handle<Noun>Post` calling those.
- **Body inside the generator, in this order**: auth (`currentDatabase` / `currentUser` / `requireRole`), then input (`decodeBody` / `decodeSearchParams` / `new URL(request.url)`), then `const mongo = yield* Mongo`, then the work, then `return yield* ok(...)`.
- Never `yield* Effect.flatMap(Auth, ...)` or `yield* Effect.flatMap(Mongo, ...)` inline — bind the service to a `const` first, or use an accessor.
- The `GET` / `POST` / `DELETE` exports are one line: `runRoute(theEffect)`.
- No `try/catch`, no status codes, no `NextResponse` except a genuine non-JSON body (file download). Every failure is a typed `Effect.fail(new NotFoundError(...))`.

## Comments

The code is the documentation. Do not write comments that restate it.

- No section-divider banners (`// ─── GET ───`).
- No "// fetch the user", "// validate the body" narration.
- A comment earns its place only for a non-obvious *why* (a workaround, a spec quirk, an ordering constraint), and then it is one line.
- Keep the `@swagger` annotation, but only the fields that are true and useful — it generates `openapi-spec.json`.

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
