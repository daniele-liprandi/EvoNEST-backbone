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
            traitsCollection.createIndex({ quantity: 1 }),
            traitsCollection.createIndex({ sampleId: 1 })
        ]);

        // Create indexes for attachments collection (polymorphic file <-> entity join)
        const attachmentsCollection = db.collection("attachments");
        const attachmentsIndexes = await Promise.all([
            attachmentsCollection.createIndex({ targetType: 1, targetId: 1 }),
            attachmentsCollection.createIndex({ fileId: 1 })
        ]);

        // Content-addressed dedup for GridFS-backed files. Partial so external
        // links (no sha256) and any legacy row are exempt from the uniqueness.
        const filesCollection = db.collection("files");
        const filesIndexes = await Promise.all([
            filesCollection.createIndex(
                { sha256: 1 },
                { unique: true, partialFilterExpression: { sha256: { $type: "string" } } }
            )
        ]);

        // Log results
        console.log(`Created indexes:
            - traits.quantity: ${traitsIndexes[0]}
            - traits.sampleId: ${traitsIndexes[1]}
            - attachments.targetType_targetId: ${attachmentsIndexes[0]}
            - attachments.fileId: ${attachmentsIndexes[1]}
            - files.sha256 (unique, partial): ${filesIndexes[0]}
        `);

        return { traitsIndexes, attachmentsIndexes, filesIndexes };
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
        const attachmentsCollection = db.collection("attachments");
        const filesCollection = db.collection("files");

        await Promise.all([
            traitsCollection.dropIndex("quantity_1"),
            traitsCollection.dropIndex("sampleId_1"),
            attachmentsCollection.dropIndex("targetType_1_targetId_1"),
            attachmentsCollection.dropIndex("fileId_1"),
            filesCollection.dropIndex("sha256_1")
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
