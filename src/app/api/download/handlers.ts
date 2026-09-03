import { Effect } from "effect";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { ObjectId } from "mongodb";
import {
  currentDatabase,
  Mongo,
  attempt,
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/effect";
import { requireEnv } from "@/app/api/utils/env";

const STORAGE_PATH = requireEnv("STORAGE_PATH");

// The stored path comes from the database. Confirm it resolves inside the
// storage root before touching the filesystem.
const isWithinStorage = (filePath: string) => {
  const root = path.resolve(STORAGE_PATH);
  const resolved = path.resolve(filePath);
  return resolved === root || resolved.startsWith(root + path.sep);
};

const toSafeFilename = (name: unknown) =>
  String(name || "download")
    .replace(/[\r\n"\\;]/g, "_")
    .replace(/[^\w\-. ]/g, "_")
    .slice(0, 255);

const isHexId = (v: string) => ObjectId.isValid(v) && new ObjectId(v).toHexString() === v;

export const downloadFile = (request: Request) =>
  Effect.gen(function* () {
    const fileId = new URL(request.url).searchParams.get("id");
    if (!fileId) return yield* Effect.fail(new ValidationError({ message: "File ID is required." }));
    if (!isHexId(fileId)) return yield* Effect.fail(new ValidationError({ message: "Invalid file id." }));

    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;

    const fileDoc = yield* mongo.findOne(dbName, "files", { _id: new ObjectId(fileId) });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File" }));

    const filePath = fileDoc.path;
    if (typeof filePath !== "string" || !isWithinStorage(filePath)) {
      return yield* Effect.fail(new ForbiddenError({ message: "Invalid file path." }));
    }

    const exists = yield* Effect.either(attempt(() => fs.access(filePath), "fs.access"));
    if (exists._tag === "Left") {
      return yield* Effect.fail(new NotFoundError({ resource: "File on the server" }));
    }

    const fileBuffer = yield* attempt(() => fs.readFile(filePath), "fs.readFile");
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(toSafeFilename(fileDoc.name))}"`,
        "Content-Type": "application/octet-stream",
      },
    });
  });
