const { MongoClient } = require('mongodb');
const { up, down } = require('./migration');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Setup Indexes Migration', () => {
    let mongod;
    let client;
    let db;
    let traitsCollection;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        client = new MongoClient(uri);
        await client.connect();
        db = client.db('test');
        traitsCollection = db.collection("traits");
    });

    beforeEach(async () => {
        await traitsCollection.deleteMany({});
    });

    afterAll(async () => {
        await client.close();
        await mongod.stop();
    });

    test('should create indexes successfully', async () => {
        // Run the migration
        await up(client);

        // Verify indexes were created
        const indexes = await traitsCollection.indexes();
        const customIndexes = indexes.filter(index => index.name !== '_id_');

        // Verify we have exactly 2 custom indexes
        expect(customIndexes).toHaveLength(2);

        // Verify specific indexes
        expect(customIndexes.some(index => index.key.type === 1)).toBeTruthy();
        expect(customIndexes.some(index => index.key.sampleId === 1)).toBeTruthy();
    });

    test('should drop indexes successfully during down migration', async () => {
        // First create indexes
        await up(client);

        // Then run down migration
        await down(client);

        // Verify only _id index remains
        const indexes = await traitsCollection.indexes();
        
        // Should only have the default _id index
        expect(indexes).toHaveLength(1);
        expect(indexes[0].name).toBe('_id_');
    });

    test('should handle multiple runs gracefully', async () => {
        // Run migration twice
        await up(client);
        await up(client);

        // Verify indexes are still correct
        const indexes = await traitsCollection.indexes();
        const customIndexes = indexes.filter(index => index.name !== '_id_');

        expect(customIndexes).toHaveLength(2);
    });
});
