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

async function up() {
    await connectClient();
    try {
        const db = client.db("evonest");
        const experimentsCollection = db.collection("experiments");
        const rawdataCollection = db.collection("rawdata");

        // Fetch all rawdata documents
        const rawdataDocuments = await rawdataCollection.find({}).toArray();

        console.log(`Found ${rawdataDocuments.length} rawdata documents to migrate`);

        let migratedCount = 0;
        let errorCount = 0;

        for (let rawdata of rawdataDocuments) {
            try {
                // Find the corresponding experiment
                const experiment = await experimentsCollection.findOne({ _id: rawdata.experimentId });
                
                if (!experiment) {
                    console.warn(`No experiment found for rawdata with experimentId: ${rawdata.experimentId}`);
                    errorCount++;
                    continue;
                }

                // Update the experiment with embedded rawdata
                const updateResult = await experimentsCollection.updateOne(
                    { _id: rawdata.experimentId },
                    {
                        $set: {
                            data: rawdata.data,
                            originalData: rawdata.originalData || rawdata.data,
                            metadata: rawdata.metadata || {},
                            // Preserve version info if it exists
                            ...(rawdata.version && { dataVersion: rawdata.version })
                        }
                    }
                );

                if (updateResult.modifiedCount > 0) {
                    console.log(`Migrated rawdata for experiment: ${rawdata.experimentId}`);
                    migratedCount++;
                } else {
                    console.warn(`Failed to update experiment: ${rawdata.experimentId}`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`Error processing rawdata ${rawdata._id}:`, error);
                errorCount++;
            }
        }

        console.log(`Migration completed: ${migratedCount} successful, ${errorCount} errors`);
        
        if (errorCount === 0) {
            console.log("All rawdata successfully migrated. You can now safely drop the rawdata collection.");
            console.log("To drop the collection, run: db.rawdata.drop()");
        } else {
            console.log("Some errors occurred. Please review before dropping the rawdata collection.");
        }

    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

async function down() {
    await connectClient();
    try {
        const db = client.db("evonest");
        const experimentsCollection = db.collection("experiments");
        const rawdataCollection = db.collection("rawdata");

        console.log("Rolling back: Moving embedded rawdata back to separate collection");

        // Find all experiments with embedded rawdata
        const experiments = await experimentsCollection.find({ 
            $or: [
                { data: { $exists: true } },
                { originalData: { $exists: true } },
                { metadata: { $exists: true } }
            ]
        }).toArray();

        console.log(`Found ${experiments.length} experiments with embedded rawdata to migrate back`);

        let migratedCount = 0;
        let errorCount = 0;

        for (let experiment of experiments) {
            try {
                // Create rawdata document
                const rawDataDocument = {
                    experimentId: experiment._id,
                    data: experiment.data,
                    originalData: experiment.originalData || experiment.data,
                    metadata: experiment.metadata || {},
                    version: experiment.dataVersion || 1
                };

                // Insert into rawdata collection
                await rawdataCollection.insertOne(rawDataDocument);

                // Remove embedded data from experiment
                await experimentsCollection.updateOne(
                    { _id: experiment._id },
                    {
                        $unset: {
                            data: "",
                            originalData: "",
                            metadata: "",
                            dataVersion: ""
                        }
                    }
                );

                console.log(`Rolled back rawdata for experiment: ${experiment._id}`);
                migratedCount++;
            } catch (error) {
                console.error(`Error rolling back experiment ${experiment._id}:`, error);
                errorCount++;
            }
        }

        console.log(`Rollback completed: ${migratedCount} successful, ${errorCount} errors`);

    } catch (error) {
        console.error("Error rolling back migration:", error);
    } finally {
        await client.close();
    }
}

// Run migration
if (require.main === module) {
    const action = process.argv[2];
    if (action === 'down') {
        down();
    } else {
        up();
    }
}

module.exports = { up, down };
