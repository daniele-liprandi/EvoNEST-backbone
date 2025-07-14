const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function connectClient() {
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
    } catch (e) {
        console.error('Failed to connect to MongoDB:', e);
        process.exit(1);
    }
}

// Test function to examine logbook structures
async function inspectLogbooks(collection, collectionName, limit = 5) {
    const cursor = collection.find({
        logbook: { 
            $exists: true,
            $type: 'array',
            $elemMatch: { $type: 'string' }
        }
    }).limit(limit);

    console.log(`\nInspecting ${collectionName} collection (showing up to ${limit} documents):`);
    
    let count = 0;
    await cursor.forEach(doc => {
        console.log(`\nDocument ID: ${doc._id}`);
        console.log('Logbook structure:');
        doc.logbook.forEach((entry, index) => {
            console.log(`Entry ${index}:`, entry);
        });
        count++;
    });

    if (count === 0) {
        console.log('No documents found with incorrectly formatted logbooks');
    }
}

// Verification function to check if a logbook is correctly formatted
function isLogbookValid(logbook) {
    if (!Array.isArray(logbook)) return false;
    
    return logbook.every(entry => 
        Array.isArray(entry) && 
        entry.length === 2 && 
        typeof entry[0] === 'string' && 
        typeof entry[1] === 'string' &&
        !isNaN(new Date(entry[0]).getTime()) // Validates date format
    );
}

async function testMigration() {
    await connectClient();
    
    try {
        const db = client.db("evonest");
        const traitsCollection = db.collection("traits");
        const experimentsCollection = db.collection("experiments");

        // 1. First inspect current state
        console.log('\n=== Before Migration ===');
        await inspectLogbooks(traitsCollection, 'traits');
        await inspectLogbooks(experimentsCollection, 'experiments');

        // 2. Run migration on a test subset
        async function fixLogbookEntries(collection, collectionName, testMode = true) {
            const query = {
                logbook: { 
                    $exists: true,
                    $type: 'array',
                    $elemMatch: { $type: 'string' }
                }
            };

            // In test mode, only process a few documents
            const cursor = testMode ? 
                collection.find(query).limit(5) : 
                collection.find(query);

            let updatedCount = 0;
            let errorCount = 0;
            
            await cursor.forEach(async (doc) => {
                const logbook = doc.logbook;
                
                try {
                    if (logbook.length >= 2 && typeof logbook[0] === 'string' && typeof logbook[1] === 'string') {
                        const newLogbook = [
                            [logbook[0], logbook[1]],
                            ...logbook.slice(2).filter(Array.isArray)
                        ];

                        // Verify new logbook format before updating
                        if (!isLogbookValid(newLogbook)) {
                            throw new Error('New logbook format validation failed');
                        }

                        if (!testMode) {
                            await collection.updateOne(
                                { _id: doc._id },
                                { $set: { logbook: newLogbook } }
                            );
                        }
                        
                        updatedCount++;
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error processing document ${doc._id}:`, error);
                }
            });

            console.log(`\n${collectionName} results (${testMode ? 'TEST MODE' : 'LIVE MODE'}):`);
            console.log(`- Documents to be updated: ${updatedCount}`);
            console.log(`- Errors encountered: ${errorCount}`);
        }

        // 3. Run test migration
        console.log('\n=== Running Test Migration ===');
        await fixLogbookEntries(traitsCollection, 'traits', true);
        await fixLogbookEntries(experimentsCollection, 'experiments', true);

        // 4. Show what the data would look like after migration
        console.log('\n=== Migration Preview ===');
        const previewDoc = await traitsCollection.findOne({
            logbook: { 
                $exists: true,
                $type: 'array',
                $elemMatch: { $type: 'string' }
            }
        });

        if (previewDoc) {
            console.log('Original format:', previewDoc.logbook);
            const newLogbook = [
                [previewDoc.logbook[0], previewDoc.logbook[1]],
                ...previewDoc.logbook.slice(2).filter(Array.isArray)
            ];
            console.log('New format:', newLogbook);
        }

    } catch (error) {
        console.error("Error during test:", error);
    } finally {
        await client.close();
    }
}

// Run the test
testMigration().catch(console.error);