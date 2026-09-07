/** @jest-environment node */

import os from "os";
import realFs from "fs";
import nodePath from "path";

const STORAGE_ROOT = realFs.mkdtempSync(nodePath.join(os.tmpdir(), "evonest-attach-"));
process.env.STORAGE_PATH = STORAGE_ROOT;

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, mongoLayer, testAuth } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { uploadFile } from "@/app/api/files/handlers";
import {
  listAttachments,
  handleAttachmentPost,
  deleteAttachment,
} from "@/app/api/attachments/handlers";
import { getAttachment } from "@/app/api/attachments/[id]/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;
let responsible: ObjectId;

beforeAll(async () => {
  mongo = await setupTestMongo();
  responsible = await mongo.seedUser();
});
afterAll(async () => {
  await mongo.stop();
  realFs.rmSync(STORAGE_ROOT, { recursive: true, force: true });
});
beforeEach(async () => {
  await Promise.all(
    ["attachments", "samples", "files"].map((c) => mongo.db.collection(c).deleteMany({})),
  );
  await mongo.client.db("usersdb").collection("users").deleteMany({ auth0id: "auth0|boss" });
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown) =>
  runRoute(
    handleAttachmentPost(
      new Request("http://x/api/attachments", { method: "POST", body: JSON.stringify(body) }),
    ).pipe(Effect.provide(mongo.layer)),
  );
const list = (qs = "") =>
  runRoute(listAttachments(new Request(`http://x/api/attachments${qs}`)).pipe(Effect.provide(mongo.layer)));
const del = (id: string, layer = mongo.layer) =>
  runRoute(
    deleteAttachment(
      new Request("http://x/api/attachments", { method: "DELETE", body: JSON.stringify({ id }) }),
    ).pipe(Effect.provide(layer)),
  );

const upload = async (name: string, type: string) => {
  const form = new FormData();
  form.append("file", new File(["bytes"], name, { type }));
  form.append("type", "attach");
  form.append("metadata", JSON.stringify({ deferredLink: true }));
  const res = await runRoute(
    uploadFile(new Request("http://x/api/files", { method: "POST", body: form })).pipe(
      Effect.provide(mongo.layer),
    ),
  );
  return (await res.json()).fileId as string;
};

const seedSample = async () => {
  const _id = new ObjectId();
  await mongo.db.collection("samples").insertOne({ _id, name: `S-${Math.random()}`, logbook: [] });
  return _id;
};

const create = (over: Record<string, unknown> = {}) =>
  post({
    method: "create",
    targetType: "sample",
    category: "gallery",
    responsible: responsible.toHexString(),
    ...over,
  });

describe("attachments — create", () => {
  test("links a file to a sample, marks it permanent, stamps the sample logbook", async () => {
    const sampleId = await seedSample();
    const fileId = await upload("photo.png", "image/png");

    const res = await create({ fileId, targetId: sampleId.toHexString(), caption: "front view" });
    expect(res.status).toBe(200);
    const { id } = await res.json();

    const row = await mongo.db.collection("attachments").findOne({ _id: new ObjectId(id) });
    expect(row?.targetType).toBe("sample");
    expect(row?.targetId).toBe(sampleId.toHexString());
    expect(row?.kind).toBe("image");
    expect(row?.contentType).toBe("image/png");
    expect(row?.category).toBe("gallery");
    expect(row?.caption).toBe("front view");
    expect(String(row?.fileId)).toBe(fileId);

    const file = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(file?.metadata.isTemporary).toBe(false);

    const sample = await mongo.db.collection("samples").findOne({ _id: sampleId });
    expect(sample?.logbook.at(-1)[1]).toMatch(/Attached image front view/);
  });

  test("infers kind from the file's contentType when not supplied", async () => {
    const sampleId = await seedSample();
    const xlsx = await upload(
      "data.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const { id } = await (await create({ fileId: xlsx, targetId: sampleId.toHexString() })).json();
    const row = await mongo.db.collection("attachments").findOne({ _id: new ObjectId(id) });
    expect(row?.kind).toBe("data");
  });

  test("falls back to the filename for a file doc with no contentType", async () => {
    const sampleId = await seedSample();
    const fileId = new ObjectId();
    await mongo.db
      .collection("files")
      .insertOne({ _id: fileId, name: "scan.pdf", path: "/x/scan.pdf", metadata: {} });
    const { id } = await (
      await create({ fileId: fileId.toHexString(), targetId: sampleId.toHexString() })
    ).json();
    const row = await mongo.db.collection("attachments").findOne({ _id: new ObjectId(id) });
    expect(row?.kind).toBe("document");
    expect(row?.contentType).toBe("application/pdf");
  });

  test("rejects a missing target (404) and a missing file (404)", async () => {
    const sampleId = await seedSample();
    const fileId = await upload("x.png", "image/png");

    expect((await create({ fileId, targetId: new ObjectId().toHexString() })).status).toBe(404);
    expect(
      (await create({ fileId: new ObjectId().toHexString(), targetId: sampleId.toHexString() })).status,
    ).toBe(404);
  });

  test("rejects a bad fileId, missing category and unknown responsible (400)", async () => {
    const sampleId = await seedSample();
    const fileId = await upload("x.png", "image/png");
    expect((await create({ fileId: "nope", targetId: sampleId.toHexString() })).status).toBe(400);
    expect(
      (await post({
        method: "create",
        targetType: "sample",
        targetId: sampleId.toHexString(),
        fileId,
        responsible: responsible.toHexString(),
      })).status,
    ).toBe(400);
    expect(
      (await create({ fileId, targetId: sampleId.toHexString(), responsible: new ObjectId().toHexString() })).status,
    ).toBe(400);
  });

  test("unknown method is 400", async () => {
    expect((await post({ method: "frobnicate" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });
});

describe("attachments — list", () => {
  test("filters by target and by kind and by category", async () => {
    const a = await seedSample();
    const b = await seedSample();
    const png = await upload("p.png", "image/png");
    const pdf = await upload("d.pdf", "application/pdf");
    await create({ fileId: png, targetId: a.toHexString(), category: "gallery" });
    await create({ fileId: pdf, targetId: a.toHexString(), category: "sop" });
    await create({ fileId: png, targetId: b.toHexString(), category: "gallery" });

    expect((await (await list()).json()).length).toBe(3);
    expect((await (await list(`?targetType=sample&targetId=${a.toHexString()}`)).json()).length).toBe(2);
    expect((await (await list("?kind=document")).json()).length).toBe(1);
    expect((await (await list("?category=gallery")).json()).length).toBe(2);
  });
});

describe("attachments — setfield and single GET", () => {
  test("setfield updates caption; a non-settable field is 400; a missing row is 404", async () => {
    const sampleId = await seedSample();
    const fileId = await upload("p.png", "image/png");
    const { id } = await (await create({ fileId, targetId: sampleId.toHexString() })).json();

    expect((await post({ method: "setfield", id, field: "caption", value: "new" })).status).toBe(200);
    const row = await mongo.db.collection("attachments").findOne({ _id: new ObjectId(id) });
    expect(row?.caption).toBe("new");

    expect((await post({ method: "setfield", id, field: "fileId", value: "x" })).status).toBe(400);
    expect(
      (await post({ method: "setfield", id: new ObjectId().toHexString(), field: "caption", value: "x" })).status,
    ).toBe(404);
  });

  test("GET /api/attachments/[id] returns the row, 404 for a missing one, 400 for a bad id", async () => {
    const sampleId = await seedSample();
    const fileId = await upload("p.png", "image/png");
    const { id } = await (await create({ fileId, targetId: sampleId.toHexString() })).json();

    const one = await runRoute(
      getAttachment(new Request(`http://x/api/attachments/${id}`)).pipe(Effect.provide(mongo.layer)),
    );
    expect(one.status).toBe(200);
    expect((await one.json())._id).toBe(id);

    expect(
      (await runRoute(
        getAttachment(new Request(`http://x/api/attachments/${new ObjectId().toHexString()}`)).pipe(
          Effect.provide(mongo.layer),
        ),
      )).status,
    ).toBe(404);
    expect(
      (await runRoute(
        getAttachment(new Request("http://x/api/attachments/nope")).pipe(Effect.provide(mongo.layer)),
      )).status,
    ).toBe(400);
  });
});

describe("attachments — delete + the attachments.delete gate", () => {
  const asRole = (role: string) =>
    Layer.merge(
      mongoLayer(mongo.client),
      testAuth({
        sub: "auth0|test",
        name: "T",
        activeDatabase: mongo.dbName,
        databases: [mongo.dbName],
        role,
      }),
    );

  test("last-attachment delete removes the file doc and bytes; a non-last delete keeps them", async () => {
    const a = await seedSample();
    const b = await seedSample();
    const fileId = await upload("shared.png", "image/png");
    const { id: idA } = await (await create({ fileId, targetId: a.toHexString() })).json();
    const { id: idB } = await (await create({ fileId, targetId: b.toHexString() })).json();
    const filePath = (await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) }))!.path;

    const first = await del(idA);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ fileDeleted: false, fileDocDeleted: false });
    expect(await mongo.db.collection("files").countDocuments()).toBe(1);
    expect(realFs.existsSync(filePath)).toBe(true);

    const second = await del(idB);
    expect(await second.json()).toMatchObject({ fileDeleted: true, fileDocDeleted: true });
    expect(await mongo.db.collection("files").countDocuments()).toBe(0);
    expect(realFs.existsSync(filePath)).toBe(false);
  });

  test("a missing attachment is 404, a bad id is 400", async () => {
    expect((await del(new ObjectId().toHexString())).status).toBe(404);
    expect((await del("nope")).status).toBe(400);
  });

  test("a role without attachments.delete is refused with 403 once an admin exists", async () => {
    await mongo.client.db("usersdb").collection("users").insertOne({ role: "admin", auth0id: "auth0|boss" });
    const sampleId = await seedSample();
    const fileId = await upload("p.png", "image/png");
    const { id } = await (await create({ fileId, targetId: sampleId.toHexString() })).json();

    expect((await del(id, asRole("viewer"))).status).toBe(403);
    expect(await mongo.db.collection("attachments").findOne({ _id: new ObjectId(id) })).not.toBeNull();
    expect((await del(id, asRole("researcher"))).status).toBe(200);
  });
});
