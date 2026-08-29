import { Effect, Schema, ParseResult } from "effect";
import { ValidationError } from "./errors";

function toIssues(error: ParseResult.ParseError) {
  return ParseResult.ArrayFormatter.formatErrorSync(error).map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Parse the JSON body of a request against a schema. Fails with
 * {@link ValidationError} on invalid JSON or a schema mismatch, with the
 * per-field issues attached.
 */
export const decodeBody =
  <A, I>(schema: Schema.Schema<A, I>) =>
  (request: Request): Effect.Effect<A, ValidationError> =>
    Effect.tryPromise({
      try: () => request.json() as Promise<unknown>,
      catch: () => new ValidationError({ message: "Request body is not valid JSON" }),
    }).pipe(
      Effect.flatMap((json) =>
        Schema.decodeUnknown(schema, { errors: "all" })(json).pipe(
          Effect.mapError(
            (error) =>
              new ValidationError({ message: "Request body failed validation", issues: toIssues(error) }),
          ),
        ),
      ),
    );

/**
 * Parse the URL search params of a request against a schema. Every value comes
 * in as a string, so the schema should decode from strings.
 */
export const decodeSearchParams =
  <A, I extends Record<string, string>>(schema: Schema.Schema<A, I>) =>
  (request: Request): Effect.Effect<A, ValidationError> =>
    Effect.sync(() => Object.fromEntries(new URL(request.url).searchParams)).pipe(
      Effect.flatMap((params) =>
        Schema.decodeUnknown(schema, { errors: "all" })(params).pipe(
          Effect.mapError(
            (error) =>
              new ValidationError({ message: "Query parameters failed validation", issues: toIssues(error) }),
          ),
        ),
      ),
    );
