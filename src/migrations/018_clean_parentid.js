const { MongoClient, ObjectId } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://root:pass@localhost:27017";
const client = new MongoClient(uri);

// Check if we're in dry run mode
const isDryRun = process.argv.includes('--dryrun');

/**
 * Checks if the input is a valid ObjectId
 * @param {any} id - The ID to check
 * @returns {boolean} - True if the ID is valid, false otherwise
 */
function isValidObjectId(id) {
    if (!id) return false;
    
    // If it's already an ObjectId, it's valid
    if (id instanceof ObjectId) return true;
    
    // If it's a string, check if it can be converted to ObjectId
    if (typeof id === 'string') {
        try {
            new ObjectId(id);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    return false;
}

async function connectClient() {
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
    } catch (e) {
        console.error('Failed to connect to MongoDB:', e);
        process.exit(1);
    }
}

async function up() {
    await connectClient();
    try {
        // Get all databases (to support both evonest and other user-specific databases)
        const dbNames = await client.db().admin().listDatabases();
        const relevantDbs = dbNames.databases
            .filter(db => !['admin', 'config', 'local'].includes(db.name));
        
        console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN (invalid parentIds will be set to null)'}`);
        
        let totalInvalidIds = 0;
        
        for (const dbInfo of relevantDbs) {
            const dbName = dbInfo.name;
            // Skip system databases and usersdb
            if (dbName === 'usersdb') continue;
            
            const db = client.db(dbName);
            
            // Check if the samples collection exists in this database
            const collections = await db.listCollections().toArray();
            if (!collections.some(col => col.name === 'samples')) {
                console.log(`Database ${dbName} does not have a samples collection, skipping.`);
                continue;
            }
            
            console.log(`\nProcessing database: ${dbName}`);
            const collection = db.collection("samples");
            
            // Find samples with a parentId field
            const samplesWithParentId = await collection.find({
                parentId: { $exists: true, $ne: null }
            }).toArray();
            
            console.log(`Found ${samplesWithParentId.length} samples with parentId field.`);
            
            const invalidSamples = samplesWithParentId.filter(sample => !isValidObjectId(sample.parentId));
            
            if (invalidSamples.length > 0) {
                console.log(`Found ${invalidSamples.length} samples with invalid parentId in ${dbName}:`);
                
                for (const sample of invalidSamples) {
                    console.log(`  - Sample ID: ${sample._id}, Name: ${sample.name}, Invalid parentId: ${sample.parentId}`);
                    totalInvalidIds++;
                }
                
                // If not in dry-run mode, update the invalid parentIds
                if (!isDryRun) {
                    const bulkOps = invalidSamples.map(sample => ({
                        updateOne: {
                            filter: { _id: sample._id },
                            update: { 
                                $set: { 
                                    parentId: null,
                                    // Add a note in the logbook about this change
                                    logbook: [
                                        ...(sample.logbook || []),
                                        [
                                            new Date().toISOString(), 
                                            `Removed invalid parentId (${sample.parentId}) by migration script`
                                        ]
                                    ]
                                } 
                            }
                        }
                    }));
                    
                    if (bulkOps.length > 0) {
                        const result = await collection.bulkWrite(bulkOps);
                        console.log(`Updated ${result.modifiedCount} samples in ${dbName}.`);
                    }
                }
            } else {
                console.log(`All parentId values in ${dbName} are valid.`);
            }
        }
        
        if (isDryRun) {
            console.log(`\nDRY RUN SUMMARY: Found ${totalInvalidIds} invalid parentId values across all databases.`);
            console.log(`Run without --dryrun to fix these issues.`);
        } else {
            console.log(`\nLIVE RUN SUMMARY: Updated ${totalInvalidIds} samples with invalid parentId values to null across all databases.`);
        }
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);
