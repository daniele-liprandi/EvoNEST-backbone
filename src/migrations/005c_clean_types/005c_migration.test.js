const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { up } = require('./005c_migration');

describe('Silktype Standardization Migration', () => {
    let mongod;
    let client;
    let db;
    let traitsCollection;

    beforeAll(async () => {
        // Create new instance of "MongoDB Memory Server"
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        
        // Create connection to in-memory database
        client = new MongoClient(uri);
        await client.connect();
        
        // Get reference to test database
        db = client.db('test');
        traitsCollection = db.collection("traits");
    });

    beforeEach(async () => {
        // Clear the collection and insert test data
        await traitsCollection.deleteMany({});
        await traitsCollection.insertMany([
            { silktype: "MAJOR AMPULLATE" },
            { silktype: "Major-Ampullate" },
            { silktype: "major_ampullate silk" },
            { silktype: "MaJoR aMpUlLaTe" },
            { silktype: "minor ampullate" },
            { silktype: "MINOR-AMPULLATE silk" },
            { silktype: "Minor Ampullate" },
            { silktype: "dragline" },  // Should not be modified
            { silktype: "minor" }      // Should not be modified
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

    test('standardizes major and minor ampullate variations', async () => {
        await up(client);  // Pass the test client

        const results = await traitsCollection.find({}).toArray();
        
        // Check major ampullate standardization
        const majorResults = results.filter(r => r.silktype.includes("major"));
        expect(majorResults).toHaveLength(4);
        majorResults.forEach(result => {
            expect(result.silktype).toBe("major ampullate");
        });

        // Check minor ampullate standardization
        const minorResults = results.filter(r => r.silktype.includes("minor ampullate"));
        expect(minorResults).toHaveLength(3);
        minorResults.forEach(result => {
            expect(result.silktype).toBe("minor ampullate");
        });

        // Check that other silktypes were not modified
        expect(results.find(r => r.silktype === "dragline")).toBeTruthy();
        expect(results.find(r => r.silktype === "minor")).toBeTruthy();
    });

    test('handles empty and null values', async () => {
        await traitsCollection.insertMany([
            { silktype: "" },
            { silktype: null },
            {}
        ]);

        await up(client);  // Pass the test client

        const emptyResults = await traitsCollection.find({
            $or: [
                { silktype: "" },
                { silktype: null },
                { silktype: { $exists: false } }
            ]
        }).toArray();

        expect(emptyResults).toHaveLength(3);
    });
});