const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const fs = require('fs');
const crypto = require('crypto');
const mime = require('mime-types');
const { kindFromMime } = require('../shared/config/attachment-targets');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://root:pass@localhost:27017";

// Third slice of #207. Sweep every disk-backed `files` document in a live NEST
// into GridFS so the bytes travel with a mongodump/restore.
//
//  - For each `files` doc with a string `path` and no `storage`: read the bytes,
//    hash them (sha256), sniff the MIME type, stream into the per-NEST `files`
//    GridFS bucket, and set `storage: { backend: "gridfs", ref, sha256 }` +
//    `size` + `mime`, then $unset `path`.
//  - Content-addressed dedup: the first doc for a given hash is the canonical
//    holder and also carries a top-level `sha256` (the unique key). A later doc
//    with the same hash is *repointed* at the canonical blob — no second copy is
//    stored — and carries only `storage.sha256`.
//  - The file on disk is left in place. A later cleanup migration removes
//    STORAGE_PATH once an operator has verified the sweep.
//  - No external links are created; that backend is forward-only.
//
// Re-runnable: a doc already on `storage.backend === "gridfs"` is skipped, as is
// an `external` one. Pass { dryRun: true } (or --dryrun) to report the recap
// without writing. Independent of migration 021 — it only touches `files`.

const BUCKET_NAME = 'files';

const GB = 1024 ** 3;
const formatBytes = (n) => (n >= GB ? `${(n / GB).toFixed(1)} GB` : `${(n / (1024 * 1024)).toFixed(1)} MB`);

const sniffMime = (fileDoc) =>
  (typeof fileDoc.mime === 'string' && fileDoc.mime) ||
  (typeof fileDoc.contentType === 'string' && fileDoc.contentType) ||
  mime.lookup(fileDoc.path || fileDoc.name || '') ||
  'application/octet-stream';

function uploadBufferToGridFS(bucket, filename, buffer, metadata) {
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, { metadata });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(buffer);
  });
}

const blankNestRecap = (name) => ({
  name,
  files: 0,
  imported: 0,
  alreadyGridfs: 0,
  external: 0,
  dedupSourceBlobs: 0, // blobs that turned out to be duplicates (repointed)
  storedBlobs: 0, // unique blobs actually written to GridFS
  bytesOnDisk: 0,
  bytesInGridFS: 0,
  failures: [], // { id, path, reason }
});

async function processDatabase(client, dbName, isDryRun, totals) {
  const db = client.db(dbName);
  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  if (!collections.includes('files')) return null;

  const files = db.collection('files');
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  const recap = blankNestRecap(dbName);

  recap.files = await files.countDocuments({});
  recap.alreadyGridfs = await files.countDocuments({ 'storage.backend': 'gridfs' });
  recap.external = await files.countDocuments({ 'storage.backend': 'external' });

  // Disk-backed: a string `path` and no `storage` discriminator yet.
  const pending = await files
    .find({ path: { $type: 'string' }, storage: { $exists: false } })
    .toArray();

  // hash -> ref of a blob already in GridFS for this NEST (seeded from a prior run).
  const blobByHash = new Map();
  for (const doc of await files
    .find({ 'storage.backend': 'gridfs', sha256: { $type: 'string' } })
    .project({ sha256: 1, 'storage.ref': 1 })
    .toArray()) {
    if (doc.storage?.ref) blobByHash.set(doc.sha256, doc.storage.ref);
  }

  for (const doc of pending) {
    let buffer;
    try {
      buffer = fs.readFileSync(doc.path);
    } catch (err) {
      recap.failures.push({ id: String(doc._id), path: doc.path, reason: err.code || 'read failed' });
      continue;
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const mimeType = sniffMime(doc);
    const size = buffer.length;
    recap.bytesOnDisk += size;

    const known = blobByHash.get(sha256);
    let ref;
    let canonical;
    if (known) {
      ref = known;
      canonical = false;
      recap.dedupSourceBlobs += 1;
    } else {
      canonical = true;
      recap.storedBlobs += 1;
      recap.bytesInGridFS += size;
      if (isDryRun) {
        // Pretend the blob was stored so a later duplicate in this run is counted
        // as a dedup rather than a second store.
        blobByHash.set(sha256, new ObjectId());
        ref = blobByHash.get(sha256);
      } else {
        ref = await uploadBufferToGridFS(bucket, doc.name || String(doc._id), buffer, {
          contentType: mimeType,
          migratedFrom: doc.path,
        });
        blobByHash.set(sha256, ref);
      }
    }

    recap.imported += 1;

    if (!isDryRun) {
      const set = {
        mime: mimeType,
        contentType: mimeType,
        kind: kindFromMime(mimeType),
        size,
        storage: { backend: 'gridfs', ref, sha256, importedFrom: doc.path },
      };
      // The canonical doc for a blob also owns the unique top-level sha256.
      if (canonical) set.sha256 = sha256;
      await files.updateOne({ _id: doc._id }, { $set: set, $unset: { path: '' } });
    }
  }

  totals.files += recap.files;
  totals.imported += recap.imported;
  totals.bytesOnDisk += recap.bytesOnDisk;
  totals.bytesInGridFS += recap.bytesInGridFS;
  totals.failures += recap.failures.length;
  totals.nests += 1;

  return recap;
}

function printRecap(recap, isDryRun) {
  const dedupCandidates = recap.storedBlobs + recap.dedupSourceBlobs;
  console.log(`\nNEST ${recap.name}:`);
  console.log(`  files:            ${recap.files}`);
  console.log(
    `  imported:         ${recap.imported}   (${recap.alreadyGridfs} already gridfs, ${recap.external} external)`,
  );
  console.log(`  deduplicated:     ${dedupCandidates} -> ${recap.storedBlobs} blobs`);
  console.log(`  bytes on disk:    ${formatBytes(recap.bytesOnDisk)}`);
  console.log(`  bytes in GridFS:  ${formatBytes(recap.bytesInGridFS)}   (after dedup)`);
  if (recap.failures.length === 0) {
    console.log(`  failures:         0`);
  } else {
    console.log(
      `  failures:         ${recap.failures.length}   (missing on disk: ${recap.failures.length} - ids: ${recap.failures
        .map((f) => f.id)
        .join(', ')})`,
    );
  }
  if (isDryRun) console.log(`  (dry run — nothing written)`);
}

async function up(testClient = null, options = {}) {
  const isDryRun = options.dryRun ?? process.argv.includes('--dryrun');

  let client = testClient;
  let ownsClient = false;
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    ownsClient = true;
    console.log('Connected successfully to MongoDB');
  }

  const totals = { nests: 0, files: 0, imported: 0, bytesOnDisk: 0, bytesInGridFS: 0, failures: 0 };
  const recaps = [];

  try {
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'}`);

    const dbNames = await client.db().admin().listDatabases();
    const relevantDbs = dbNames.databases.filter(
      (d) => !['admin', 'config', 'local', 'usersdb'].includes(d.name),
    );

    for (const dbInfo of relevantDbs) {
      const recap = await processDatabase(client, dbInfo.name, isDryRun, totals);
      if (recap) {
        recaps.push(recap);
        printRecap(recap, isDryRun);
      }
    }

    console.log(
      `\nTOTAL across ${totals.nests} NEST(s): ${totals.files} files, ` +
        `${formatBytes(totals.bytesOnDisk)} -> ${formatBytes(totals.bytesInGridFS)} in GridFS, ` +
        `${totals.failures} failure(s).`,
    );
    if (isDryRun) console.log('Run without --dryrun to apply.');

    return { totals, nests: recaps };
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    if (ownsClient) await client.close();
  }
}

if (require.main === module) {
  up().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { up };
