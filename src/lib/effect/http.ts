import { Cause, Effect, Exit, Layer } from "effect";
import { NextResponse } from "next/server";
import type { ApiError } from "./errors";
import { Mongo, MongoLive } from "./db";
import { Auth, AuthLive } from "./auth";

/** Services available to every route: the database and authentication. */
const AppLive = Layer.provideMerge(AuthLive, MongoLive);

interface ErrorBody {
  /** Human-readable message. Flat, so existing `result.error` reads keep working. */
  readonly error: string;
  /** Stable machine code: `validation_error`, `unauthorized`, ... */
  readonly code: string;
  readonly issues?: ReadonlyArray<{ readonly path: string; readonly message: string }>;
}

const json = (body: ErrorBody, status: number) => NextResponse.json(body, { status });

const INTERNAL: ErrorBody = { error: "Internal server error", code: "internal_error" };

function errorResponse(error: ApiError): NextResponse {
  switch (error._tag) {
    case "ValidationError":
      return json({ error: error.message, code: "validation_error", issues: error.issues }, 400);
    case "UnauthorizedError":
      return json({ error: error.message ?? "Unauthorized", code: "unauthorized" }, 401);
    case "ForbiddenError":
      return json({ error: error.message ?? "Forbidden", code: "forbidden" }, 403);
    case "NotFoundError":
      return json({ error: `${error.resource} not found`, code: "not_found" }, 404);
    case "ConflictError":
      return json({ error: error.message, code: "conflict" }, 409);
    case "InternalError":
      console.error("[api] internal error:", error.cause ?? error.message);
      return json(INTERNAL, 500);
  }
}

/**
 * Run a route Effect and turn its outcome into a Response.
 *
 * A success value is returned as-is. A tagged {@link ApiError} is mapped to the
 * matching HTTP status and a `{ error, code }` body. Any defect (a throw that
 * was never modelled) is logged and returned as a bare 500, so internals never
 * reach the client.
 */
export async function runRoute(
  effect: Effect.Effect<NextResponse, ApiError, Mongo | Auth>,
): Promise<NextResponse> {
  const exit = await Effect.runPromiseExit(Effect.provide(effect, AppLive));
  return Exit.match(exit, {
    onSuccess: (response) => response,
    onFailure: (cause) => {
      const failure = Cause.failureOption(cause);
      if (failure._tag === "Some") {
        return errorResponse(failure.value);
      }
      console.error("[api] unhandled defect:\n" + Cause.pretty(cause));
      return json(INTERNAL, 500);
    },
  });
}

/** Shorthand for the common `Effect<NextResponse, ApiError>` success case. */
export const ok = <A>(data: A, init?: ResponseInit): Effect.Effect<NextResponse> =>
  Effect.sync(() => NextResponse.json(data as object, init));
