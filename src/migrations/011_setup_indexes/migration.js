const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

async function up(testClient = null, dbName = "test") {
    let client;
    try {
        // Use provided test client or create a new connection
        if (testClient) {
            client = testClient;
        } else {
            client = new MongoClient(uri);
            await client.connect();
        }

        const db = client.db(dbName);

        // Create indexes for traits collection
        const traitsCollection = db.collection("traits");
        const traitsIndexes = await Promise.all([
            traitsCollection.createIndex({ type: 1 }),
            traitsCollection.createIndex({ sampleId: 1 })
        ]);

        // Log results
        console.log(`Created indexes:
            - traits.type: ${traitsIndexes[0]}
            - traits.sampleId: ${traitsIndexes[1]}
        `);

        return traitsIndexes;
    } catch (error) {
        console.error("Error creating indexes:", error);
        throw error;
    } finally {
        // Only close if we created our own client
        if (!testClient && client) {
            await client.close();
        }
    }
}

async function down(testClient = null, dbName = "test") {
    let client;
    try {
        if (testClient) {
            client = testClient;
        } else {
            client = new MongoClient(uri);
            await client.connect();
        }

        const db = client.db(dbName);
        const traitsCollection = db.collection("traits");

        await Promise.all([
            traitsCollection.dropIndex("type_1"),
            traitsCollection.dropIndex("sampleId_1")
        ]);

        console.log("Indexes dropped successfully");
    } catch (error) {
        console.error("Error dropping indexes:", error);
        throw error;
    } finally {
        if (!testClient && client) {
            await client.close();
        }
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const database = args[0] || "test";

    console.log(`Running migration with:
- Database: ${database}
`);

    up(null, database).catch(console.error);
}
module.exports = { up, down };