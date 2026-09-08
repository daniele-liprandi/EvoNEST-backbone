const os = require('os');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./022_files_to_gridfs');

jest.setTimeout(60_000);

describe('files -> GridFS migration (022)', () => {
  let mongod;
  let client;
  let db;
  let files;
  let bucket;
  let storageRoot;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    db = client.db('nest_testlab');
    files = db.collection('files');
    bucket = new GridFSBucket(db, { bucketName: 'files' });
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await files.deleteMany({});
    await db.collection('files.files').deleteMany({});
    await db.collection('files.chunks').deleteMany({});
    storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'evonest-022-'));
  });

  afterEach(() => {
    fs.rmSync(storageRoot, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  /** Write a real file on disk and its (pre-migration) `files` document. */
  const seedDiskFile = async (name, content, extra = {}) => {
    const _id = new ObjectId();
    const filePath = path.join(storageRoot, `${_id}`, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    await files.insertOne({
      _id,
      name,
      path: filePath,
      contentType: extra.contentType,
      metadata: { isTemporary: false },
    });
    return _id;
  };

  const streamOf = (ref) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      bucket
        .openDownloadStream(ref)
        .on('data', (c) => chunks.push(c))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });

  test('imports every disk file into GridFS and rewrites the document', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const id = await seedDiskFile('notes.csv', 'a,b\n1,2\n', { contentType: 'text/csv' });

    await up(client);

    const doc = await files.findOne({ _id: id });
    expect(doc.path).toBeUndefined();
    expect(doc.storage.backend).toBe('gridfs');
    expect(doc.storage.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.storage.importedFrom).toContain('notes.csv');
    expect(doc.sha256).toBe(doc.storage.sha256);
    expect(doc.mime).toBe('text/csv');
    expect(doc.kind).toBe('data');
    expect(doc.size).toBe(8);

    expect((await streamOf(doc.storage.ref)).toString()).toBe('a,b\n1,2\n');
  });

  test('dedups identical content to one blob, repointing the later doc', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const a = await seedDiskFile('one.txt', 'same bytes');
    const b = await seedDiskFile('two.txt', 'same bytes');

    const { nests } = await up(client);

    const da = await files.findOne({ _id: a });
    const db2 = await files.findOne({ _id: b });
    expect(String(da.storage.ref)).toBe(String(db2.storage.ref));
    // Only the canonical doc carries the unique top-level sha256.
    expect(da.sha256).toBeDefined();
    expect(db2.sha256).toBeUndefined();
    expect(db2.storage.sha256).toBe(da.storage.sha256);

    expect(await db.collection('files.files').countDocuments()).toBe(1);
    expect(nests[0]).toMatchObject({ imported: 2, storedBlobs: 1, dedupSourceBlobs: 1 });
  });

  test('a missing file on disk is counted as a failure and left alone', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const id = await seedDiskFile('gone.pdf', 'x');
    fs.rmSync(path.dirname((await files.findOne({ _id: id })).path), { recursive: true, force: true });

    const { nests, totals } = await up(client);

    expect(totals.failures).toBe(1);
    expect(nests[0].failures[0].id).toBe(String(id));
    const doc = await files.findOne({ _id: id });
    expect(doc.path).toBeDefined();
    expect(doc.storage).toBeUndefined();
  });

  test('is a no-op in dry-run mode', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await seedDiskFile('a.txt', 'aaa');
    await seedDiskFile('b.txt', 'aaa');

    const { nests } = await up(client, { dryRun: true });

    expect(nests[0]).toMatchObject({ imported: 2, storedBlobs: 1, dedupSourceBlobs: 1 });
    expect(await db.collection('files.files').countDocuments()).toBe(0);
    expect((await files.findOne({ name: 'a.txt' })).storage).toBeUndefined();
  });

  test('re-running skips already-migrated documents', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await seedDiskFile('keep.txt', 'hello');

    await up(client);
    const first = await db.collection('files.files').countDocuments();
    const { nests } = await up(client);

    expect(nests[0].imported).toBe(0);
    expect(nests[0].alreadyGridfs).toBe(1);
    expect(await db.collection('files.files').countDocuments()).toBe(first);
  });

  test('prints a per-NEST recap and a TOTAL line', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await seedDiskFile('r.txt', 'recap me');

    await up(client);

    const out = log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(out).toMatch(/NEST nest_testlab:/);
    expect(out).toMatch(/imported:\s+1/);
    expect(out).toMatch(/deduplicated:\s+1 -> 1 blobs/);
    expect(out).toMatch(/TOTAL across 1 NEST\(s\): 1 files/);
  });
});
