const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

// Validation function to check logbook format
function isLogbookValid(logbook) {
    if (!Array.isArray(logbook)) return false;

    // Only validate the first entry which is what we're transforming
    const firstEntry = logbook[0];
    return Array.isArray(firstEntry) &&
        firstEntry.length === 2 &&
        typeof firstEntry[0] === 'string' &&
        typeof firstEntry[1] === 'string' &&
        !isNaN(new Date(firstEntry[0]).getTime());
}

async function processCollection(collection, collectionName, stats) {
    console.log(`\nProcessing ${collectionName} collection...`);

    // Find documents that need fixing
    const cursor = collection.find({
        logbook: {
            $exists: true,
            $type: 'array',
            $elemMatch: { $type: 'string' }
        }
    });

    // Get all documents at once to avoid session timeout issues
    const documents = await cursor.toArray();
    const totalToProcess = documents.length;
    console.log(`Found ${totalToProcess} documents to process`);

    // Process documents sequentially
    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        stats[collectionName].processed++;

        try {
            const logbook = doc.logbook;

            // Only process if we have the incorrect format
            if (logbook.length >= 2 && typeof logbook[0] === 'string' && typeof logbook[1] === 'string') {
                // Create new logbook array
                const newLogbook = [
                    [logbook[0], logbook[1]],
                    ...logbook.slice(2)
                ];

                // Validate new format before updating
                if (!isLogbookValid(newLogbook)) {
                    throw new Error(`Invalid logbook format for document ${doc._id}`);
                }

                // Update the document
                const result = await collection.updateOne(
                    { _id: doc._id },
                    { $set: { logbook: newLogbook } }
                );

                if (result.modifiedCount === 1) {
                    stats[collectionName].updated++;
                }
            }

            // Log progress every 100 documents
            if ((i + 1) % 100 === 0 || i === documents.length - 1) {
                const progress = (((i + 1) / totalToProcess) * 100).toFixed(2);
                console.log(`Progress: ${progress}% (${i + 1}/${totalToProcess})`);
                console.log(`Updated: ${stats[collectionName].updated}, Errors: ${stats[collectionName].errors}`);
            }

        } catch (error) {
            stats[collectionName].errors++;
            console.error(`Error processing document ${doc._id} in ${collectionName}:`, error.message);
        }
    }

    // Final stats for this collection
    console.log(`\nCompleted ${collectionName}:`);
    console.log(`- Processed: ${stats[collectionName].processed}`);
    console.log(`- Updated: ${stats[collectionName].updated}`);
    console.log(`- Errors: ${stats[collectionName].errors}`);
}

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

        // Define collections to process
        const collections = {
            traits: db.collection("traits"),
            experiments: db.collection("experiments"),
            samples: db.collection("samples")
        };

        // Initialize stats object
        const stats = Object.keys(collections).reduce((acc, name) => {
            acc[name] = { processed: 0, updated: 0, errors: 0 };
            return acc;
        }, {});

        // Process each collection
        for (const [name, collection] of Object.entries(collections)) {
            await processCollection(collection, name, stats);
        }

        // Final summary
        console.log('\n=== Migration Summary ===');
        for (const [collection, data] of Object.entries(stats)) {
            console.log(`\n${collection}:`);
            console.log(`- Total processed: ${data.processed}`);
            console.log(`- Successfully updated: ${data.updated}`);
            console.log(`- Errors encountered: ${data.errors}`);
        }

        // Check for errors
        const totalErrors = Object.values(stats).reduce((sum, data) => sum + data.errors, 0);
        if (totalErrors > 0) {
            throw new Error(`Migration completed with ${totalErrors} errors. Please check the logs.`);
        }

        console.log("\nMigration completed successfully");

    } catch (error) {
        console.error("\nError applying migration:", error);
        throw error;
    } finally {
        if (!testClient && client) {
            await client.close();
        }
    }
}

async function down() {
    console.log("Down migration not implemented");
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