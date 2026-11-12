const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./024_move_nest_out_of_admin_db');

describe('Move the NEST out of the admin database (024)', () => {
    let mongod;
    let client;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        client = new MongoClient(mongod.getUri());
        await client.connect();
    });

    afterAll(async () => {
        await client.close();
        await mongod.stop();
    });

    beforeEach(async () => {
        for (const db of ['evonest', 'other', 'usersdb', 'systemdb']) await client.db(db).dropDatabase();
        const admin = client.db('admin');
        for (const c of await admin.listCollections({}, { nameOnly: true }).toArray()) {
            if (!c.name.startsWith('system.')) await admin.collection(c.name).drop();
        }
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => jest.restoreAllMocks());

    const seedAdminNest = async () => {
        await client.db('admin').collection('samples').insertMany([{ name: 'A1' }, { name: 'A2' }]);
        await client.db('admin').collection('samples').createIndex({ name: 1 });
        await client.db('admin').collection('config').insertOne({ type: 'traitquantities', data: [] });
        await client.db('usersdb').collection('users').insertMany([
            { name: 'demo', activeDatabase: 'admin', databases: ['admin'] },
            { name: 'other', activeDatabase: 'lab', databases: ['lab', 'admin', 'evonest'] },
            { name: 'untouched', activeDatabase: 'lab', databases: ['lab'] },
        ]);
        await client.db('systemdb').collection('settings').insertOne({ type: 'databases', databases: ['admin', 'evonest', 'lab'] });
    };

    test('moves lab collections, users and the database list to evonest', async () => {
        await seedAdminNest();

        const summary = await up(client, { dryRun: false });

        expect(summary.moved.sort()).toEqual(['config', 'samples']);
        expect(await client.db('evonest').collection('samples').countDocuments()).toBe(2);
        expect((await client.db('evonest').collection('samples').indexes()).map((i) => i.name)).toContain('name_1');
        const left = (await client.db('admin').listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
        expect(left.filter((n) => !n.startsWith('system.'))).toEqual([]);

        const users = client.db('usersdb').collection('users');
        expect(await users.findOne({ name: 'demo' })).toMatchObject({ activeDatabase: 'evonest', databases: ['evonest'] });
        expect(await users.findOne({ name: 'other' })).toMatchObject({ activeDatabase: 'lab', databases: ['lab', 'evonest'] });
        expect(summary.usersUpdated).toBe(2);
        expect((await client.db('systemdb').collection('settings').findOne({})).databases).toEqual(['evonest', 'lab']);
    });

    test('stops when the target already has one of the collections', async () => {
        await seedAdminNest();
        await client.db('evonest').collection('samples').insertOne({ name: 'existing' });

        const summary = await up(client, { dryRun: false });

        expect(summary.skipped).toBe('clash');
        expect(await client.db('admin').collection('samples').countDocuments()).toBe(2);
        expect((await client.db('usersdb').collection('users').findOne({ name: 'demo' })).activeDatabase).toBe('admin');
    });

    test('--to picks another target; dry run writes nothing', async () => {
        await seedAdminNest();

        const dry = await up(client, { dryRun: true, to: 'other' });
        expect(dry.moved.sort()).toEqual(['config', 'samples']);
        expect(await client.db('admin').collection('samples').countDocuments()).toBe(2);

        await up(client, { dryRun: false, to: 'other' });
        expect(await client.db('other').collection('samples').countDocuments()).toBe(2);
    });

    test('nothing to move is a no-op', async () => {
        expect((await up(client, { dryRun: false })).skipped).toBe('empty');
    });
});
