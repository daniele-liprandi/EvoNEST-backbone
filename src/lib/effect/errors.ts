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
 * The request was well-formed but names something that cannot be processed —
 * an upstream service that answered with unusable content, for example.
 */
export class UnprocessableEntityError extends Data.TaggedError("UnprocessableEntityError")<{
  readonly message: string;
  readonly details?: unknown;
}> {}

/**
 * An upstream service this route depends on failed or was unreachable. Distinct
 * from {@link InternalError}: the fault is downstream, not in this app.
 */
export class BadGatewayError extends Data.TaggedError("BadGatewayError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * A dependency this route needs is not configured or is temporarily down (a
 * missing LLM endpoint, a disabled integration).
 */
export class ServiceUnavailableError extends Data.TaggedError("ServiceUnavailableError")<{
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
  | UnprocessableEntityError
  | BadGatewayError
  | ServiceUnavailableError
  | InternalError;
