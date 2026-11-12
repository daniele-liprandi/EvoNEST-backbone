const fs = require('fs');
const os = require('os');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./021_media_docs_to_attachments');

describe('Media/docs + filesId to attachments migration (021)', () => {
    let mongod;
    let client;
    let db;
    let experiments;
    let samples;
    let traits;
    let attachments;
    let files;
    let storagePath;

    const run = (opts = {}) => up(client, { storagePath, ...opts });

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        client = new MongoClient(mongod.getUri());
        await client.connect();
        db = client.db('nest_testlab');
        experiments = db.collection('experiments');
        samples = db.collection('samples');
        traits = db.collection('traits');
        attachments = db.collection('attachments');
        files = db.collection('files');
        storagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'evonest-021-'));
    });

    afterAll(async () => {
        await client.close();
        await mongod.stop();
        fs.rmSync(storagePath, { recursive: true, force: true });
    });

    beforeEach(async () => {
        await Promise.all([
            experiments.deleteMany({}), samples.deleteMany({}), traits.deleteMany({}),
            attachments.deleteMany({}), files.deleteMany({}),
        ]);
    });

    const sampleId = () => new ObjectId().toString();

    test('decodes an inline base64 image into a files doc + disk file and a sample gallery row', async () => {
        const sid = sampleId();
        await samples.insertOne({ _id: new ObjectId(sid), name: 'S1' });
        const png = Buffer.from('hello png bytes');
        await experiments.insertOne({
            name: 'Photo', type: 'image', sampleId: sid, responsible: 'user-1',
            date: '2026-01-02', notes: 'left spinneret',
            data: png.toString('base64'), originalData: png.toString('base64'),
        });

        const summary = await run();

        expect(summary.filesDecoded).toBe(1);
        expect(summary.experimentsDeleted).toBe(1);
        expect(await experiments.countDocuments({})).toBe(0);

        const row = await attachments.findOne({ targetType: 'sample', targetId: sid });
        expect(row.category).toBe('gallery');
        expect(row.kind).toBe('image');
        expect(row.caption).toBe('left spinneret');
        expect(row.responsible).toBe('user-1');
        expect(row.date).toBe('2026-01-02');

        const fileDoc = await files.findOne({ _id: row.fileId });
        expect(fs.readFileSync(fileDoc.path)).toEqual(png);
        expect(fileDoc.metadata.isTemporary).toBe(false);
    });

    test('reuses an existing fileId instead of decoding', async () => {
        const sid = sampleId();
        await samples.insertOne({ _id: new ObjectId(sid), name: 'S1' });
        const fid = new ObjectId();
        await files.insertOne({ _id: fid, name: 'scan.pdf', path: '/x/scan.pdf', contentType: 'application/pdf' });
        await experiments.insertOne({
            name: 'Scan', type: 'document', sampleId: sid, fileId: fid.toString(),
            data: Buffer.from('ignored blob').toString('base64'),
        });

        const summary = await run();

        expect(summary.filesReused).toBe(1);
        expect(summary.filesDecoded).toBe(0);
        const row = await attachments.findOne({ targetType: 'sample', targetId: sid });
        expect(row.fileId).toEqual(fid);
        expect(row.category).toBe('document');
        expect(row.kind).toBe('document');
        expect(await files.countDocuments({})).toBe(1);
    });

    test('fans filesId[] out to one row per file and strips the field', async () => {
        const sid = new ObjectId();
        const f1 = new ObjectId();
        const f2 = new ObjectId();
        await files.insertMany([
            { _id: f1, name: 'a.png', path: '/x/a.png', contentType: 'image/png' },
            { _id: f2, name: 'b.csv', path: '/x/b.csv', contentType: 'text/csv' },
        ]);
        await samples.insertOne({ _id: sid, name: 'S1', filesId: [f1.toString(), f2.toString()] });

        const summary = await run();

        expect(summary.sampleRows).toBe(2);
        const rows = await attachments.find({ targetType: 'sample', targetId: sid.toString() }).toArray();
        expect(rows.map((r) => r.kind).sort()).toEqual(['data', 'image']);
        expect(rows.every((r) => r.category === 'gallery')).toBe(true);
        expect((await samples.findOne({ _id: sid })).filesId).toBeUndefined();
    });

    test('routes trait and non-media experiment file refs to their own targets', async () => {
        const tid = new ObjectId();
        const eid = new ObjectId();
        const ft = new ObjectId();
        const fe = new ObjectId();
        await files.insertMany([
            { _id: ft, name: 't.png', path: '/x/t.png', contentType: 'image/png' },
            { _id: fe, name: 'e.json', path: '/x/e.json', contentType: 'application/json' },
        ]);
        await traits.insertOne({ _id: tid, quantity: 'diameter', filesId: [ft.toString()] });
        await experiments.insertOne({ _id: eid, name: 'Tensile', type: 'tensile_test', fileId: fe.toString() });

        const summary = await run();

        expect(summary.traitRows).toBe(1);
        expect(summary.experimentRows).toBe(1);
        expect((await attachments.findOne({ targetType: 'trait' })).category).toBe('gallery');
        const expRow = await attachments.findOne({ targetType: 'experiment' });
        expect(expRow.category).toBe('raw-data');
        expect(expRow.kind).toBe('data');
        expect((await experiments.findOne({ _id: eid })).fileId).toBeUndefined();
        expect(await experiments.countDocuments({})).toBe(1); // non-media experiment survives
    });

    test('skips orphaned refs without creating rows', async () => {
        const sid = new ObjectId();
        await samples.insertOne({ _id: sid, name: 'S1', filesId: [new ObjectId().toString()] });
        await experiments.insertOne({
            name: 'Ghost', type: 'image', sampleId: sid.toString(), fileId: new ObjectId().toString(),
        });

        const summary = await run();

        expect(summary.orphansSkipped).toBe(2);
        expect(await attachments.countDocuments({})).toBe(0);
        expect(await experiments.countDocuments({ name: 'Ghost' })).toBe(1); // kept, nothing to move
    });

    test('dry run reports counts and writes nothing', async () => {
        const sid = sampleId();
        await samples.insertOne({ _id: new ObjectId(sid), name: 'S1' });
        await experiments.insertOne({
            name: 'Photo', type: 'image', sampleId: sid,
            data: Buffer.from('bytes').toString('base64'),
        });

        const summary = await run({ dryRun: true });

        expect(summary.filesDecoded).toBe(1);
        expect(summary.experimentsDeleted).toBe(1);
        expect(await attachments.countDocuments({})).toBe(0);
        expect(await files.countDocuments({})).toBe(0);
        const kept = await experiments.findOne({ name: 'Photo' });
        expect(kept.data).toBe(Buffer.from('bytes').toString('base64'));
    });

    test('is safe to run twice', async () => {
        const sid = sampleId();
        await samples.insertOne({ _id: new ObjectId(sid), name: 'S1', filesId: [] });
        const fid = new ObjectId();
        await files.insertOne({ _id: fid, name: 'a.png', path: '/x/a.png', contentType: 'image/png' });
        await samples.updateOne({ _id: new ObjectId(sid) }, { $set: { filesId: [fid.toString()] } });
        await experiments.insertOne({
            name: 'Photo', type: 'image', sampleId: sid,
            data: Buffer.from('bytes').toString('base64'),
        });

        const first = await run();
        const second = await run();

        expect(second.mediaExperiments).toBe(0);
        expect(second.sampleRows).toBe(0);
        expect(second.experimentsDeleted).toBe(0);
        expect(await attachments.countDocuments({})).toBe(first.sampleRows + first.mediaExperiments);
    });

    test('deletes a media experiment left behind by a half-finished prior run', async () => {
        const sid = sampleId();
        await samples.insertOne({ _id: new ObjectId(sid), name: 'S1' });
        const exp = await experiments.insertOne({
            name: 'Photo', type: 'image', sampleId: sid,
            data: Buffer.from('bytes').toString('base64'),
        });
        await attachments.insertOne({
            fileId: new ObjectId(), targetType: 'sample', targetId: sid, category: 'gallery',
            kind: 'image', migratedFromExperimentId: exp.insertedId.toString(),
        });

        const summary = await run();

        expect(summary.alreadyMigrated).toBe(1);
        expect(summary.experimentsDeleted).toBe(1);
        expect(await experiments.countDocuments({})).toBe(0);
        expect(await attachments.countDocuments({})).toBe(1);
    });
});
