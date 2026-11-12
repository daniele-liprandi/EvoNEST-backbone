const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { kindFromMime } = require('../shared/config/attachment-targets');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://root:pass@localhost:27017";
const DEFAULT_STORAGE_PATH = process.env.STORAGE_PATH || "/usr/evonest/file_storage";

// Second slice of #206. Move every existing file reference in a live NEST onto
// the `attachments` collection (from 2a / #208) and retire `experiments` as a
// media store.
//
//  - experiments with type image/document  -> one `attachments` row on the
//    experiment's sample (category gallery / document); the experiment is
//    deleted. The file is the experiment's `fileId`, else its first `filesId[]`,
//    else the base64 blob in data/originalData/rawdata decoded to a `files` doc
//    + disk file (022/#207 later sweeps those into GridFS).
//  - samples.filesId[]  -> rows targetType sample,     category gallery
//  - traits.filesId[]   -> rows targetType trait,      category gallery
//  - filesId[] / fileId on the remaining experiments -> rows targetType
//    experiment, category raw-data
//  - `filesId` / `fileId` are stripped from the entity docs; the base64 blobs
//    are unset from media experiments before they are deleted.
//
// Re-runnable: an entity whose refs are already gone (or already have an
// attachment row) is skipped. Pass { dryRun: true } (or --dryrun) to report
// counts without writing. Independent of migration 020.

const MEDIA_TYPES = ['image', 'document'];
const CATEGORY_BY_MEDIA_TYPE = { image: 'gallery', document: 'document' };
const BLOB_FIELDS = ['data', 'originalData', 'rawdata'];

const stamp = () => new Date().toISOString();

const sanitizeFilename = (filename) =>
  String(filename)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 255);

/** files._id is always an ObjectId; filesId[] / fileId hold hex strings. */
const toFileObjectId = (v) => {
  if (v instanceof ObjectId) return v;
  const s = String(v);
  return ObjectId.isValid(s) ? new ObjectId(s) : null;
};

const findFileDoc = async (files, ref) => {
  const _id = toFileObjectId(ref);
  return _id ? files.findOne({ _id }) : null;
};

/** The base64 payload a media experiment stores inline, prefix stripped. */
const pickBlob = (experiment) => {
  for (const field of BLOB_FIELDS) {
    const value = experiment[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      const comma = value.startsWith('data:') ? value.indexOf(',') : -1;
      return { field, base64: comma >= 0 ? value.slice(comma + 1) : value };
    }
  }
  return null;
};

const contentTypeOf = (fileDoc) =>
  (typeof fileDoc.contentType === 'string' && fileDoc.contentType) ||
  mime.lookup(fileDoc.path || fileDoc.name || '') ||
  null;

function buildAttachmentDoc({ fileId, targetType, targetId, category, kind, contentType, caption, responsible, date, extra }) {
  const now = stamp();
  return {
    fileId,
    targetType,
    targetId: String(targetId),
    category,
    kind,
    contentType: contentType || null,
    caption: caption ?? null,
    stepKey: null,
    order: null,
    responsible: responsible ?? null,
    date: date || now,
    createdAt: now,
    recentChangeDate: now,
    logbook: [[now, `Migration 021 attached ${kind} (file ${fileId}) to ${targetType} ${targetId}`]],
    ...extra,
  };
}

/** Write a decoded base64 blob as a `files` doc + disk file, the upload way. */
async function writeDecodedFile(db, experiment, blob, storagePath, dbName, isDryRun) {
  const files = db.collection('files');
  const ext = experiment.filename
    ? path.extname(experiment.filename)
    : experiment.type === 'image'
      ? '.jpg'
      : '';
  const filename = sanitizeFilename(experiment.filename || `${experiment.name || experiment._id}${ext}`);
  const contentType =
    mime.lookup(filename) || (experiment.type === 'image' ? 'image/jpeg' : null);

  if (isDryRun) return { fileId: null, contentType };

  const fileId = new ObjectId();
  // Same layout as an upload, plus a per-file segment so two decoded blobs on one
  // sample can't collide on a shared filename.
  const filePath = path.join(
    storagePath, dbName, experiment.type, 'sample', String(experiment.sampleId), `${fileId}`, filename,
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(blob.base64, 'base64'));

  await files.insertOne({
    _id: fileId,
    name: filename,
    path: filePath,
    ...(contentType ? { contentType } : {}),
    metadata: {
      entryType: 'sample',
      entryId: String(experiment.sampleId),
      uploadDate: new Date(),
      isTemporary: false,
      migratedFromExperimentId: String(experiment._id),
    },
  });
  return { fileId, contentType };
}

/**
 * image/document experiments -> a gallery/document attachment on the sample,
 * then the experiment is deleted.
 */
async function migrateMediaExperiments(db, dbName, storagePath, summary, isDryRun) {
  const experiments = db.collection('experiments');
  const attachments = db.collection('attachments');
  const files = db.collection('files');

  const media = await experiments.find({ type: { $in: MEDIA_TYPES } }).toArray();
  if (media.length === 0) return;
  console.log(`Found ${media.length} media experiment(s) in ${dbName}.`);

  for (const experiment of media) {
    const expId = String(experiment._id);

    if (await attachments.findOne({ migratedFromExperimentId: expId })) {
      // A prior run created the row but did not delete the experiment.
      summary.alreadyMigrated++;
      if (!isDryRun) await experiments.deleteOne({ _id: experiment._id });
      summary.experimentsDeleted++;
      continue;
    }

    if (!experiment.sampleId) {
      console.log(`  Skipping media experiment ${expId}: no sampleId to attach to.`);
      summary.orphansSkipped++;
      continue;
    }

    // Resolve the file: fileId, else first resolvable filesId[], else the blob.
    let resolved = null;
    if (experiment.fileId) {
      const fileDoc = await findFileDoc(files, experiment.fileId);
      if (fileDoc) resolved = { fileId: fileDoc._id, contentType: contentTypeOf(fileDoc), reused: true };
    }
    if (!resolved && Array.isArray(experiment.filesId)) {
      for (const ref of experiment.filesId) {
        const fileDoc = await findFileDoc(files, ref);
        if (fileDoc) {
          resolved = { fileId: fileDoc._id, contentType: contentTypeOf(fileDoc), reused: true };
          break;
        }
      }
    }
    let blob = null;
    if (!resolved) {
      blob = pickBlob(experiment);
      if (blob) {
        const written = await writeDecodedFile(db, experiment, blob, storagePath, dbName, isDryRun);
        resolved = { fileId: written.fileId, contentType: written.contentType, reused: false };
      }
    }

    if (!resolved) {
      console.log(`  Skipping media experiment ${expId}: no file, no filesId, no blob.`);
      summary.orphansSkipped++;
      continue;
    }

    if (resolved.reused) summary.filesReused++;
    else summary.filesDecoded++;
    summary.mediaExperiments++;

    const kind = experiment.type; // "image" | "document" — both valid attachment kinds
    const doc = buildAttachmentDoc({
      fileId: resolved.fileId,
      targetType: 'sample',
      targetId: experiment.sampleId,
      category: CATEGORY_BY_MEDIA_TYPE[experiment.type],
      kind,
      contentType: resolved.contentType,
      caption: experiment.notes || experiment.name || null,
      responsible: experiment.responsible,
      date: experiment.date,
      extra: { migratedFromExperimentId: expId },
    });

    if (!isDryRun) {
      await attachments.insertOne(doc);
      await experiments.updateOne(
        { _id: experiment._id },
        { $unset: { data: '', originalData: '', rawdata: '', filesId: '', fileId: '' } },
      );
      await experiments.deleteOne({ _id: experiment._id });
    }
    summary.experimentsDeleted++;
  }
}

/**
 * A `filesId[]` (and optionally `fileId`) fan-out on one entity collection ->
 * one attachment row per resolvable file, then the refs are stripped.
 */
async function migrateFilesIdFanout(db, collectionName, targetType, category, summary, counterKey, isDryRun, { includeFileId = false, extraFilter = {} } = {}) {
  const collection = db.collection(collectionName);
  const attachments = db.collection('attachments');
  const files = db.collection('files');

  const or = [{ filesId: { $exists: true, $ne: [] } }];
  if (includeFileId) or.push({ fileId: { $exists: true, $ne: null } });
  const entities = await collection.find({ $and: [extraFilter, { $or: or }] }).toArray();
  if (entities.length === 0) return;

  for (const entity of entities) {
    const refs = [];
    if (includeFileId && entity.fileId) refs.push(entity.fileId);
    if (Array.isArray(entity.filesId)) refs.push(...entity.filesId);
    const seen = new Set();

    for (const ref of refs) {
      const key = String(ref);
      if (seen.has(key)) continue;
      seen.add(key);

      const fileDoc = await findFileDoc(files, ref);
      if (!fileDoc) {
        summary.orphansSkipped++;
        continue;
      }
      const existing = await attachments.findOne({
        fileId: fileDoc._id, targetType, targetId: String(entity._id),
      });
      if (existing) {
        summary.alreadyMigrated++;
        continue;
      }
      const contentType = contentTypeOf(fileDoc);
      const doc = buildAttachmentDoc({
        fileId: fileDoc._id,
        targetType,
        targetId: entity._id,
        category,
        kind: kindFromMime(contentType),
        contentType,
        caption: null,
        responsible: entity.responsible,
        date: entity.date,
      });
      if (!isDryRun) await attachments.insertOne(doc);
      summary[counterKey]++;
    }

    if (!isDryRun) {
      await collection.updateOne({ _id: entity._id }, { $unset: { filesId: '', fileId: '' } });
    }
  }
}

async function processDatabase(db, dbName, storagePath, summary, isDryRun) {
  console.log(`\nProcessing database: ${dbName}`);
  summary.databases++;

  await migrateMediaExperiments(db, dbName, storagePath, summary, isDryRun);
  await migrateFilesIdFanout(db, 'samples', 'sample', 'gallery', summary, 'sampleRows', isDryRun);
  await migrateFilesIdFanout(db, 'traits', 'trait', 'gallery', summary, 'traitRows', isDryRun);
  // A media experiment that survived (skipped as an orphan) keeps its dead ref —
  // it is not an experiment-target file, so it stays out of this fan-out.
  await migrateFilesIdFanout(db, 'experiments', 'experiment', 'raw-data', summary, 'experimentRows', isDryRun, {
    includeFileId: true,
    extraFilter: { type: { $nin: MEDIA_TYPES } },
  });
}

async function up(testClient = null, options = {}) {
  const isDryRun = options.dryRun ?? process.argv.includes('--dryrun');
  const storagePath = options.storagePath ?? DEFAULT_STORAGE_PATH;

  let client = testClient;
  let ownsClient = false;
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    ownsClient = true;
    console.log('Connected successfully to MongoDB');
  }

  const summary = {
    databases: 0,
    mediaExperiments: 0,
    filesReused: 0,
    filesDecoded: 0,
    experimentsDeleted: 0,
    sampleRows: 0,
    traitRows: 0,
    experimentRows: 0,
    orphansSkipped: 0,
    alreadyMigrated: 0,
  };

  try {
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'}`);
    console.log(`Storage path: ${storagePath}`);

    const dbNames = await client.db().admin().listDatabases();
    const relevantDbs = dbNames.databases.filter(
      (db) => !['admin', 'config', 'local', 'usersdb'].includes(db.name),
    );

    for (const dbInfo of relevantDbs) {
      const db = client.db(dbInfo.name);
      const collections = (await db.listCollections().toArray()).map((c) => c.name);
      if (!collections.includes('experiments') && !collections.includes('samples') && !collections.includes('traits')) {
        console.log(`Database ${dbInfo.name} has no NEST collections, skipping.`);
        continue;
      }
      await processDatabase(db, dbInfo.name, storagePath, summary, isDryRun);
    }

    const line =
      `${summary.mediaExperiments} media experiment(s) -> sample attachments ` +
      `(${summary.filesReused} file(s) reused, ${summary.filesDecoded} blob(s) decoded), ` +
      `${summary.experimentsDeleted} experiment(s) deleted; ` +
      `${summary.sampleRows} sample, ${summary.traitRows} trait, ${summary.experimentRows} experiment ` +
      `filesId row(s); ${summary.orphansSkipped} orphan(s) skipped, ` +
      `${summary.alreadyMigrated} already migrated, across ${summary.databases} database(s).`;
    console.log(`\n${isDryRun ? 'DRY RUN' : 'LIVE RUN'} SUMMARY: ${line}`);
    if (isDryRun) console.log('Run without --dryrun to apply.');

    return summary;
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
