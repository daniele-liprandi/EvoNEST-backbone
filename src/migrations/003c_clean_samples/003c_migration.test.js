const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./003c_migration');

describe('Silktype Standardization Migration', () => {
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
        // Clear the collection and insert test data
        await samplesCollection.deleteMany({});
        await samplesCollection.insertMany([
            { silktype: "bridging web" },
            { silktype: "bridging line" },
            { silktype: "Bridging web" },
            { silktype: "bridging webbing" },
            { silktype: "bridging" },
            { silktype: "dragline" },
            { silktype: "minor" }
        ]);
    });

    afterAll(async () => {
        if (client) {
            await client.close();
        }
        if (mongod) {
            await mongod.stop();
        }
    });

    test('standardizes bridging line variations', async () => {
        await up(client);  // Pass the test client

        const results = await samplesCollection.find({}).toArray();
        
        const firstResults = results.filter(r => r.silktype.includes("bridging line"));
        expect(firstResults).toHaveLength(4);
        firstResults.forEach(result => {
            expect(result.silktype).toBe("bridging line");
        });

        // Check that other silktypes were not modified
        expect(results.find(r => r.silktype === "dragline")).toBeTruthy();
    });

    test('handles empty and null values', async () => {
        await samplesCollection.insertMany([
            { silktype: "" },
            { silktype: null },
            {}
        ]);

        await up(client);  // Pass the test client

        const emptyResults = await samplesCollection.find({
            $or: [
                { silktype: "" },
                { silktype: null },
                { silktype: { $exists: false } }
            ]
        }).toArray();

        expect(emptyResults).toHaveLength(3);
    });
});