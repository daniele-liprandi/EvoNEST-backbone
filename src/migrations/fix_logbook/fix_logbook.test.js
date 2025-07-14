const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up, down } = require('./fix_logbook'); // Update path as needed

let mongod;
let client;
let db;

beforeAll(async () => {
    // Create new MongoDB Memory Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
});

afterAll(async () => {
    await client.close();
    await mongod.stop();  // Changed from mongoServer to mongod
});

beforeEach(async () => {
    // Clear all collections before each test
    const collections = ['samples', 'traits', 'experiments'];
    for (const collection of collections) {
        await db.collection(collection).deleteMany({});
    }
});

describe('Logbook Migration Tests', () => {
    test('should correctly transform logbook format', async () => {
        // Prepare test data
        const sampleData = {
            _id: 'test1',
            logbook: [
                '2024-01-20T12:00:00.000Z',
                'Initial entry',
                ['2024-01-21T12:00:00.000Z', 'Second entry']
            ]
        };

        // Insert test data
        await db.collection('samples').insertOne(sampleData);

        await up(client, 'test');

        // Verify results
        const updatedDoc = await db.collection('samples').findOne({ _id: 'test1' });
        expect(updatedDoc.logbook).toEqual([
            ['2024-01-20T12:00:00.000Z', 'Initial entry'],
            ['2024-01-21T12:00:00.000Z', 'Second entry']
        ]);
    });

    test('should handle empty logbooks', async () => {
        const emptyLogbookDoc = {
            _id: 'empty',
            logbook: []
        };

        await db.collection('samples').insertOne(emptyLogbookDoc);
        await up(client, 'test');

        const result = await db.collection('samples').findOne({ _id: 'empty' });
        expect(result.logbook).toEqual([]);
    });

    test('should process multiple collections', async () => {
        const testData = {
            samples: { _id: 'sample1', logbook: ['2024-01-20T12:00:00.000Z', 'Test'] },
            traits: { _id: 'trait1', logbook: ['2024-01-20T12:00:00.000Z', 'Test'] },
            experiments: { _id: 'exp1', logbook: ['2024-01-20T12:00:00.000Z', 'Test'] }
        };

        // Insert test data into all collections
        for (const [collection, data] of Object.entries(testData)) {
            await db.collection(collection).insertOne(data);
        }

        await up(client, 'test');

        // Verify all collections were processed
        for (const [collection, data] of Object.entries(testData)) {
            const result = await db.collection(collection).findOne({ _id: data._id });
            expect(result.logbook).toEqual([
                ['2024-01-20T12:00:00.000Z', 'Test']
            ]);
        }
    });

    test('should skip already transformed documents', async () => {
        const alreadyTransformed = {
            _id: 'transformed',
            logbook: [['2024-01-20T12:00:00.000Z', 'Already correct format']]
        };

        await db.collection('samples').insertOne(alreadyTransformed);
        await up(client, 'test');

        const result = await db.collection('samples').findOne({ _id: 'transformed' });
        expect(result.logbook).toEqual([
            ['2024-01-20T12:00:00.000Z', 'Already correct format']
        ]);
    });

    test('should handle invalid dates gracefully', async () => {
        const invalidDate = {
            _id: 'invalid',
            logbook: ['invalid-date', 'Test entry']
        };

        await db.collection('samples').insertOne(invalidDate);
        await up(client, 'test');

        // The document should remain unchanged due to validation failure
        const result = await db.collection('samples').findOne({ _id: 'invalid' });
        expect(result.logbook).toEqual(['invalid-date', 'Test entry']);
    });
});