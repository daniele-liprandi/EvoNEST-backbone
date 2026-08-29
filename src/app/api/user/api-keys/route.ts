import { Effect, Schema } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, ok, decodeBody, currentUser, Mongo, ValidationError, NotFoundError } from "@/lib/effect";
import { generateApiKey } from "@/app/api/utils/apiKeyAuth";

/**
 * @swagger
 * /api/user/api-keys:
 *   get:
 *     summary: List the current user's API keys (previews only)
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ apiKeys, totalKeys, activeKeys }" }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Generate a new API key (returned in full once)
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ apiKey, keyId, ... }" }
 *       401: { description: Unauthorized }
 *   delete:
 *     summary: Revoke an API key by keyId or key
 *     tags: [Users]
 *     responses:
 *       200: { description: Revoked }
 *       400: { description: keyId or key required }
 *       401: { description: Unauthorized }
 *       404: { description: Not found or already revoked }
 */

const USERS = "users";
const USERS_DB = "usersdb";

interface StoredKey {
  _id?: ObjectId;
  key: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount?: number;
}

export const listApiKeys = Effect.gen(function* () {
  const user = yield* currentUser;
  const keys: StoredKey[] = (user.doc.apiKeys as StoredKey[]) ?? [];

  const apiKeys = keys.map((key) => ({
    id: key._id ?? key.key.slice(-8),
    name: key.name,
    keyPreview: `...${key.key.slice(-8)}`,
    isActive: key.isActive,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    usageCount: key.usageCount ?? 0,
    databases: user.databases,
  }));

  return yield* ok({
    apiKeys,
    totalKeys: apiKeys.length,
    activeKeys: apiKeys.filter((k) => k.isActive).length,
  });
});

const CreateBody = Schema.Struct({
  name: Schema.optional(Schema.String),
  expiresInDays: Schema.optional(Schema.Number),
});

export const createApiKey = (request: Request) =>
  Effect.gen(function* () {
    const user = yield* currentUser;
    const { name, expiresInDays } = yield* decodeBody(CreateBody)(request);
    const mongo = yield* Mongo;

    const now = new Date();
    const key = generateApiKey();
    const record: StoredKey & { _id: ObjectId } = {
      _id: new ObjectId(),
      key,
      name: name || `API Key ${now.toISOString()}`,
      isActive: true,
      createdAt: now.toISOString(),
      expiresAt:
        expiresInDays && expiresInDays > 0
          ? new Date(now.getTime() + expiresInDays * 86_400_000).toISOString()
          : null,
      lastUsedAt: null,
      usageCount: 0,
    };

    const result = yield* mongo.updateOne(
      USERS_DB,
      USERS,
      { _id: user.doc._id },
      { $push: { apiKeys: record, logbook: `${now.toISOString()}: Created API key "${record.name}"` } },
    );
    if (result.modifiedCount === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "User" }));
    }

    return yield* ok({
      message: "API key created successfully",
      apiKey: key,
      keyId: record._id.toString(),
      name: record.name,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      warning: "This is the only time you will see the full API key. Save it securely.",
    });
  });

const DeleteBody = Schema.Struct({
  keyId: Schema.optional(Schema.String),
  key: Schema.optional(Schema.String),
});

export const revokeApiKey = (request: Request) =>
  Effect.gen(function* () {
    const user = yield* currentUser;
    const { keyId, key } = yield* decodeBody(DeleteBody)(request);
    if (!keyId && !key) {
      return yield* Effect.fail(new ValidationError({ message: "keyId or key is required" }));
    }
    const mongo = yield* Mongo;
    const now = new Date().toISOString();

    const result = yield* mongo.updateOne(
      USERS_DB,
      USERS,
      { _id: user.doc._id },
      {
        $set: { "apiKeys.$[k].isActive": false },
        $push: { logbook: keyId ? `${now}: Revoked API key ${keyId}` : `${now}: Revoked API key` },
      },
      { arrayFilters: [keyId ? { "k._id": new ObjectId(keyId) } : { "k.key": key }] },
    );
    if (result.modifiedCount === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "API key" }));
    }
    return yield* ok({ message: "API key revoked successfully" });
  });

export const GET = () => runRoute(listApiKeys);
export const POST = (request: Request) => runRoute(createApiKey(request));
export const DELETE = (request: Request) => runRoute(revokeApiKey(request));
