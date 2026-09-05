const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./020_trait_fields_rename');

describe('Trait fields rename migration (020)', () => {
    let mongod;
    let client;
    let traits;
    let samples;
    let experiments;
    let config;
    let users;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        client = new MongoClient(mongod.getUri());
        await client.connect();
        const db = client.db('nest_testlab');
        traits = db.collection('traits');
        samples = db.collection('samples');
        experiments = db.collection('experiments');
        config = db.collection('config');
        users = client.db('usersdb').collection('users');
    });

    afterAll(async () => {
        await client.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        await Promise.all([
            traits.deleteMany({}), samples.deleteMany({}), experiments.deleteMany({}),
            config.deleteMany({}), users.deleteMany({}),
        ]);
        for (const name of await traits.indexes().then(ix => ix.map(i => i.name)).catch(() => [])) {
            if (name !== '_id_') await traits.dropIndex(name).catch(() => {});
        }
    });

    test('renames type to quantity and measurement to value', async () => {
        await traits.insertMany([
            { type: 'diameter', measurement: 2.5, unit: 'um' },
            { type: 'modulus', measurement: 9e9, unit: 'Pa' },
        ]);

        await up(client, { dryRun: false });

        const docs = await traits.find({}).toArray();
        expect(docs.every(d => d.type === undefined && d.measurement === undefined)).toBe(true);
        expect(docs.map(d => d.quantity).sort()).toEqual(['diameter', 'modulus']);
        expect(docs.find(d => d.quantity === 'diameter').value).toBe(2.5);
    });

    test('drops the stale method field from traits, samples, experiments, config and users', async () => {
        await traits.insertMany([
            { type: 'diameter', measurement: 2.5, method: 'create' },
            { quantity: 'mass', value: 1.2, method: 'setfield' },
            { quantity: 'strain', value: 0.1, method: 'calculated' },
        ]);
        await samples.insertOne({ name: 'S1', method: 'update' });
        await experiments.insertOne({ name: 'E1', method: 'create' });
        await config.insertOne({ type: 'traittypes', data: [], method: 'additem' });
        await users.insertOne({ name: 'U1', method: 'create' });

        const summary = await up(client, { dryRun: false });

        expect((await traits.find({}).toArray()).every(t => t.method === undefined)).toBe(true);
        expect((await samples.findOne({ name: 'S1' })).method).toBeUndefined();
        expect((await experiments.findOne({ name: 'E1' })).method).toBeUndefined();
        expect((await config.findOne({ type: 'traittypes' })).method).toBeUndefined();
        expect((await users.findOne({ name: 'U1' })).method).toBeUndefined();
        expect(summary.methodDropped).toBe(7);
    });

    test('leaves documents without the old fields untouched', async () => {
        await traits.insertOne({ quantity: 'mass', value: 1.2, unit: 'g' });

        await up(client, { dryRun: false });

        const doc = await traits.findOne({ quantity: 'mass' });
        expect(doc.value).toBe(1.2);
        expect(doc.type).toBeUndefined();
    });

    test('swaps the type_1 index for quantity_1', async () => {
        await traits.createIndex({ type: 1 });
        await traits.insertOne({ type: 'diameter', measurement: 1 });

        await up(client, { dryRun: false });

        const names = (await traits.indexes()).map(i => i.name);
        expect(names).toContain('quantity_1');
        expect(names).not.toContain('type_1');
    });

    test('dry run reports counts without writing', async () => {
        await traits.insertMany([
            { type: 'diameter', measurement: 2.5 },
            { type: 'modulus', measurement: 9e9 },
        ]);

        const summary = await up(client, { dryRun: true });

        expect(summary.typeRenamed).toBe(2);
        expect(summary.measurementRenamed).toBe(2);
        expect(summary.methodDropped).toBe(0);
        const doc = await traits.findOne({ type: 'diameter' });
        expect(doc.measurement).toBe(2.5);
        expect(doc.quantity).toBeUndefined();
    });
});
