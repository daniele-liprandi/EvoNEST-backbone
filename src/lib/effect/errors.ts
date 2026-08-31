import { Data } from "effect";

/**
 * Tagged errors for the API layer. Every Effect that can fail in a route ends
 * up with one of these in its error channel, and `runRoute` maps each to an
 * HTTP status. Anything not in this union is a defect and becomes a 500.
 */

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly issues?: ReadonlyArray<{ readonly path: string; readonly message: string }>;
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message?: string;
}> {}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message?: string;
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly resource: string;
  readonly id?: string;
}> {}

export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly message: string;
}> {}

/**
 * A failure the caller cannot act on: a dropped database connection, a
 * misbehaving upstream service. The message is logged, never returned.
 */
export class InternalError extends Data.TaggedError("InternalError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type ApiError =
  | ValidationError
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | ConflictError
  | InternalError;
