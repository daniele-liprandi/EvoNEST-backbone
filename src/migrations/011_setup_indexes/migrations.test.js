const { MongoClient } = require('mongodb');
const { up, down } = require('./migration');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Setup Indexes Migration', () => {
    let mongod;
    let client;
    let db;
    let traitsCollection;
    let attachmentsCollection;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('test');
        traitsCollection = db.collection("traits");
        attachmentsCollection = db.collection("attachments");
    });

    beforeEach(async () => {
        await traitsCollection.deleteMany({});
        await attachmentsCollection.deleteMany({});
    });

    afterAll(async () => {
        await client.close();
        await mongod.stop();
    });

    test('should create traits and attachments indexes successfully', async () => {
        await up(client);

        const traitsIndexes = (await traitsCollection.indexes()).filter(i => i.name !== '_id_');
        expect(traitsIndexes).toHaveLength(2);
        expect(traitsIndexes.some(i => i.key.quantity === 1)).toBeTruthy();
        expect(traitsIndexes.some(i => i.key.sampleId === 1)).toBeTruthy();

        const attachmentsIndexes = (await attachmentsCollection.indexes()).filter(i => i.name !== '_id_');
        expect(attachmentsIndexes).toHaveLength(2);
        expect(attachmentsIndexes.some(i => i.key.targetType === 1 && i.key.targetId === 1)).toBeTruthy();
        expect(attachmentsIndexes.some(i => i.key.fileId === 1)).toBeTruthy();
    });

    test('should drop indexes successfully during down migration', async () => {
        await up(client);
        await down(client);

        expect(await traitsCollection.indexes()).toHaveLength(1);
        expect((await attachmentsCollection.indexes()).filter(i => i.name !== '_id_')).toHaveLength(0);
    });

    test('should handle multiple runs gracefully', async () => {
        await up(client);
        await up(client);

        expect((await traitsCollection.indexes()).filter(i => i.name !== '_id_')).toHaveLength(2);
        expect((await attachmentsCollection.indexes()).filter(i => i.name !== '_id_')).toHaveLength(2);
    });
});
