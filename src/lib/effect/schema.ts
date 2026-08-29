import { Schema } from "effect";
import { ObjectId } from "mongodb";

/**
 * A string that is a canonical 24-character hex MongoDB ObjectId. `ObjectId`
 * accepts 12-byte strings and integers too; this rejects anything that would
 * not round-trip.
 */
export const ObjectIdHex = Schema.String.pipe(
  Schema.filter(
    (s) => ObjectId.isValid(s) && new ObjectId(s).toString() === s,
    { message: () => "must be a 24-character hex ObjectId" },
  ),
  Schema.brand("ObjectIdHex"),
);
export type ObjectIdHex = Schema.Schema.Type<typeof ObjectIdHex>;

/**
 * Decodes an ObjectId hex string to an `ObjectId` instance and encodes it back
 * to the string. Use in a route schema so the handler works with `ObjectId`
 * and the wire stays as a string.
 */
export const ObjectIdFromHex = Schema.transform(ObjectIdHex, Schema.instanceOf(ObjectId), {
  strict: true,
  decode: (hex) => new ObjectId(hex),
  encode: (oid) => oid.toHexString() as ObjectIdHex,
});

/** Trimmed, non-empty string. */
export const NonEmptyString = Schema.String.pipe(
  Schema.transform(Schema.String, { strict: true, decode: (s) => s.trim(), encode: (s) => s }),
  Schema.minLength(1),
);
