import { Cause, Effect, Exit } from "effect";
import { NextResponse } from "next/server";
import type { ApiError } from "./errors";
import { Mongo, MongoLive } from "./db";

interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly issues?: ReadonlyArray<{ readonly path: string; readonly message: string }>;
  };
}

const json = (body: ErrorBody, status: number) => NextResponse.json(body, { status });

const INTERNAL: ErrorBody = { error: { code: "internal_error", message: "Internal server error" } };

function errorResponse(error: ApiError): NextResponse {
  switch (error._tag) {
    case "ValidationError":
      return json({ error: { code: "validation_error", message: error.message, issues: error.issues } }, 400);
    case "UnauthorizedError":
      return json({ error: { code: "unauthorized", message: error.message ?? "Unauthorized" } }, 401);
    case "ForbiddenError":
      return json({ error: { code: "forbidden", message: error.message ?? "Forbidden" } }, 403);
    case "NotFoundError":
      return json({ error: { code: "not_found", message: `${error.resource} not found` } }, 404);
    case "ConflictError":
      return json({ error: { code: "conflict", message: error.message } }, 409);
    case "InternalError":
      console.error("[api] internal error:", error.cause ?? error.message);
      return json(INTERNAL, 500);
  }
}

/**
 * Run a route Effect and turn its outcome into a Response.
 *
 * A success value is returned as-is. A tagged {@link ApiError} is mapped to the
 * matching HTTP status and a `{ error: { code, message } }` body. Any defect
 * (a throw that was never modelled) is logged and returned as a bare 500, so
 * internals never reach the client.
 */
export async function runRoute(
  effect: Effect.Effect<NextResponse, ApiError, Mongo>,
): Promise<NextResponse> {
  const exit = await Effect.runPromiseExit(Effect.provide(effect, MongoLive));
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
