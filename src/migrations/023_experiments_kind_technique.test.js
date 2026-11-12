const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./023_experiments_kind_technique');

describe('Experiments kind/technique migration (023)', () => {
    let mongod;
    let client;
    let experiments;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        client = new MongoClient(mongod.getUri());
        await client.connect();
        experiments = client.db('nest_testlab').collection('experiments');
    });

    afterAll(async () => {
        await client.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await experiments.deleteMany({});
    });

    test('renames type to technique and backfills kind and parentId', async () => {
        await experiments.insertMany([
            { name: 'E1', type: 'tensile_test' },
            { name: 'E2', type: 'movement_tracking' },
        ]);

        const summary = await up(client, { dryRun: false });

        const docs = await experiments.find({}).sort({ name: 1 }).toArray();
        expect(docs.map(d => d.technique)).toEqual(['tensile_test', 'movement_tracking']);
        expect(docs.every(d => d.type === undefined)).toBe(true);
        expect(docs.every(d => d.kind === 'measurement' && d.parentId === null)).toBe(true);
        expect(summary).toMatchObject({ typeRenamed: 2, kindSet: 2, parentIdSet: 2 });
    });

    test('leaves an existing kind and parentId alone', async () => {
        const parentId = 'abc';
        await experiments.insertMany([
            { name: 'P', kind: 'protocol', parentId: null },
            { name: 'C', technique: 'tensile_test', kind: 'measurement', parentId },
        ]);

        await up(client, { dryRun: false });

        expect((await experiments.findOne({ name: 'P' })).kind).toBe('protocol');
        expect((await experiments.findOne({ name: 'C' })).parentId).toBe(parentId);
    });

    test('creates the kind_parentId and technique indexes', async () => {
        await experiments.insertOne({ name: 'E1', type: 'tensile_test' });

        await up(client, { dryRun: false });

        const names = (await experiments.indexes()).map(i => i.name);
        expect(names).toEqual(expect.arrayContaining(['kind_1_parentId_1', 'technique_1']));
    });

    test('dry run writes nothing', async () => {
        await experiments.insertOne({ name: 'E1', type: 'tensile_test' });

        const summary = await up(client, { dryRun: true });

        const doc = await experiments.findOne({ name: 'E1' });
        expect(doc.type).toBe('tensile_test');
        expect(doc.kind).toBeUndefined();
        expect(summary.typeRenamed).toBe(1);
    });

    test('is idempotent', async () => {
        await experiments.insertOne({ name: 'E1', type: 'tensile_test' });

        await up(client, { dryRun: false });
        const second = await up(client, { dryRun: false });

        expect(second).toMatchObject({ typeRenamed: 0, kindSet: 0, parentIdSet: 0 });
        expect((await experiments.findOne({ name: 'E1' })).technique).toBe('tensile_test');
    });
});
