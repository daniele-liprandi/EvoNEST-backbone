const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./migration');

describe('Add Death Notes Migration', () => {
    let mongod;
    let client;
    let db;
    let samplesCollection;

    beforeAll(async () => {
        // Create new instance of "MongoDB Memory Server"
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();

        // Create connection to in-memory database
        client = new MongoClient(uri);
        await client.connect();

        // Get reference to test database
        db = client.db('test');
        samplesCollection = db.collection("samples");
    });

    beforeEach(async () => {
        // Clear the collection before each test
        await samplesCollection.deleteMany({});
    });

    afterAll(async () => {
        if (client) {
            await client.close();
        }
        if (mongod) {
            await mongod.stop();
        }
    });

    test('adds notes to samples with preserved status in logbook', async () => {
        const cutoffDate = new Date('2024-02-01T00:00:00.000Z');

        await samplesCollection.insertMany([
            {
                name: "Sample1",
                notes: null,
                logbook: [
                    ["2024-02-01T10:00:00.000Z", "Set lifestatus from undefined to preserved by Jonas Wolff"]
                ]
            },
            {
                name: "Sample2",
                notes: "Previously preserved specimen",
                logbook: [
                    ["2024-02-01T10:00:00.000Z", "Set lifestatus from alive to preserved by Jonas Wolff"]
                ]
            },
            {
                name: "Sample3",
                notes: null,
                logbook: [
                    ["2024-01-15T00:00:00.000Z", "Set lifestatus from alive to lost by Jonas Wolff"]
                ]
            },
            {
                name: "Sample4",
                notes: "Previously preserved specimen",
                logbook: [
                    ["2024-01-01T00:00:00.000Z", "Set lifestatus from alive to preserved by Jonas Wolff"]
                ]
            },
        ]);

        await up(client, cutoffDate);

        const results = await samplesCollection.find({}).toArray();

        // Find Sample1 - should have exactly "Time of death unknown"
        const sample1 = results.find(s => s.name === "Sample1");
        expect(sample1.notes).toBe("Time of death unknown");
        expect(sample1.logbook).toHaveLength(2);
        expect(sample1.logbook[1][1]).toBe("Added death note through migration");

        // Find Sample2 - should have original note plus our addition
        const sample2 = results.find(s => s.name === "Sample2");
        expect(sample2.notes).toBe("Previously preserved specimen. Time of death unknown");
        expect(sample2.logbook).toHaveLength(2);

        // Find Sample3 - should be unchanged because wrong date
        const sample3 = results.find(s => s.name === "Sample3");
        expect(sample3.notes).toBeNull();
        expect(sample3.logbook).toHaveLength(1);
        
        // Find Sample4 - should be unchanged because not preserved
        const sample4 = results.find(s => s.name === "Sample4");
        expect(sample4.notes).toBe("Previously preserved specimen");
        expect(sample4.logbook).toHaveLength(1);
    });

    test('only updates samples preserved at reference date', async () => {
        const referenceDate = new Date('2024-01-15T00:00:00.000Z');

        await samplesCollection.insertMany([
            {
                name: "Sample1",
                notes: null,
                logbook: [
                    ["2024-01-15T00:00:00.000Z", "Set lifestatus from undefined to preserved by Jonas Wolff"]  // Before cutoff
                ]
            },
            {
                name: "Sample2",
                notes: null,
                logbook: [
                    ["2024-01-20T00:00:00.000Z", "Set lifestatus from undefined to preserved by Jonas Wolff"]  // After cutoff
                ]
            }
        ]);

        await up(client, referenceDate);

        const results = await samplesCollection.find({}).toArray();

        // Sample before cutoff should be updated
        const sample1 = results.find(s => s.name === "Sample1");
        expect(sample1.notes).toBe("Time of death unknown");

        // Sample after cutoff should remain unchanged
        const sample2 = results.find(s => s.name === "Sample2");
        expect(sample2.notes).toBeNull();
    });

    test('handles samples without logbook', async () => {
        const cutoffDate = new Date('2024-02-01T00:00:00.000Z');

        await samplesCollection.insertMany([
            { name: "Sample1" },
            { name: "Sample2", logbook: null },
            { name: "Sample3", logbook: [] }
        ]);

        await up(client, cutoffDate);

        const results = await samplesCollection.find({}).toArray();
        results.forEach(sample => {
            expect(sample.notes).toBeUndefined();
        });
    });

    test('does not add note if it already exists', async () => {
        const cutoffDate = new Date('2024-02-01T00:00:00.000Z');

        await samplesCollection.insertMany([
            {
                name: "Sample1",
                notes: "Previously preserved specimen. Time of death unknown",
                logbook: [
                    ["2024-02-01T00:00:00.000Z", "Set lifestatus from undefined to preserved by Jonas Wolff"]
                ]
            }
        ]);

        await up(client, cutoffDate);

        const result = await samplesCollection.findOne({ name: "Sample1" });
        expect(result.notes).toBe("Previously preserved specimen. Time of death unknown");
        // Should not have added a new logbook entry
        expect(result.logbook).toHaveLength(1);
    });
});