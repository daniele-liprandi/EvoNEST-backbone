import { Effect, Schema } from "effect";
import {
  ok,
  decodeBody,
  currentSession,
  currentDatabase,
  ValidationError,
  ServiceUnavailableError,
} from "@/lib/effect";

const MASTRA_URL = process.env.MASTRA_URL ?? "http://localhost:4111";

const Body = Schema.Struct(
  { message: Schema.optional(Schema.String), threadId: Schema.optional(Schema.String) },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

const UNREACHABLE = {
  blocks: [{ type: "text", content: "Could not reach the AI service. Please try again." }],
};

export const proxyChat = (request: Request) =>
  Effect.gen(function* () {
    yield* currentSession;
    const { message, threadId } = yield* decodeBody(Body)(request);
    if (!message || !threadId) {
      return yield* Effect.fail(new ValidationError({ message: "message and threadId are required" }));
    }

    const dbName = yield* currentDatabase;
    const serviceKey = process.env.MASTRA_SERVICE_SECRET;
    if (!serviceKey) {
      return yield* Effect.fail(new ServiceUnavailableError({ message: "AI service is not configured" }));
    }

    const call = yield* Effect.either(
      Effect.tryPromise(async () => {
        const response = await fetch(`${MASTRA_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-service-key": serviceKey },
          body: JSON.stringify({ message, threadId, dbName }),
        });
        return { ok: response.ok, data: (await response.json()) as unknown };
      }),
    );

    // A network failure is surfaced as a normal chat message, not an HTTP error,
    // so the chat panel renders it in place.
    if (call._tag === "Left") return yield* ok(UNREACHABLE);
    return yield* ok(call.right.data, { status: call.right.ok ? 200 : 502 });
  });
