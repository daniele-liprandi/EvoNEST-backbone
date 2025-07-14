const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

// Connect to the MongoDB client
async function connectClient() {
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB');
    } catch (e) {
        console.error('Failed to connect to MongoDB:', e);
        process.exit(1);
    }
}

// The migration function
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
        const rawdataCollection = db.collection("rawdata");
        const experimentsCollection = db.collection("experiments");
        const traitsCollection = db.collection("traits");

        // Get all rawdata entries
        const rawdata = await rawdataCollection.find({}).toArray();
        console.log(`Found ${rawdata.length} rawdata entries to process`);

        let updatedExperiments = 0;
        let addedTraits = 0;

        for (const data of rawdata) {
            console.log(`Processing rawdata entry with experimentId: ${data.experimentId}`);

            // Skip if no experimentId or no data
            if (!data.experimentId || !data.data) continue;

            // Calculate loadAtBreak from raw data
            let loadAtBreak = null;
            if (data.data.LoadOnSpecimen && Array.isArray(data.data.LoadOnSpecimen)) {
                // Find the maximum value in the LoadOnSpecimen array
                loadAtBreak = Math.max(...data.data.LoadOnSpecimen);
            } else {
                // Skip if no LoadOnSpecimen data
                continue;
            }

            // Find the corresponding experiment
            const experiment = await experimentsCollection.findOne({ _id: data.experimentId });
            if (!experiment) {
                console.log(`No experiment found for experimentId: ${data.experimentId}`);
                continue;
            }

            // Update the experiment with loadAtBreak
            const experimentUpdateResult = await experimentsCollection.updateOne(
                { _id: data.experimentId },
                {
                    $set: {
                        loadAtBreak: loadAtBreak,
                        recentChangeDate: new Date().toISOString()
                    },
                    $push: {
                        logbook: [
                            `${new Date().toISOString()}`,
                            `Added loadAtBreak: ${loadAtBreak}N from migration script`
                        ]
                    }
                }
            );

            if (experimentUpdateResult.modifiedCount > 0) {
                updatedExperiments++;
            }

            // Skip if no sampleId on the experiment
            if (!experiment.sampleId) continue;



            // Add a new trait for loadAtBreak
            const traitData = {
                method: "create",
                responsible: experiment.responsible || null,
                sampleId: experiment.sampleId,
                experimentId: data.experimentId,
                type: "loadAtBreak",
                measurement: loadAtBreak,
                unit: "mN",
                date: experiment.date || new Date().toISOString(),
                equipment: "tensile_test",
                notes: "Added by migration script from experiment data",
                recentChangeDate: new Date().toISOString(),
                logbook: [[`${new Date().toISOString()}`, `Created trait from experiment ${experiment.name || 'unknown'}`]]
            };

            const traitResult = await traitsCollection.insertOne(traitData);
            if (traitResult.insertedId) {
                addedTraits++;
            }
        }

        console.log(`Updated ${updatedExperiments} experiments with loadAtBreak values`);
        console.log(`Added ${addedTraits} traits for loadAtBreak`);
        console.log("Migration completed successfully");
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        // Only close if we created our own client
        if (!testClient && client) {
            await client.close();
        }
    }
}

// Function to revert the migration if needed
async function down() {
    await connectClient();

    try {
        const db = client.db("evonext");
        const experimentsCollection = db.collection("experiments");
        const traitsCollection = db.collection("traits");

        // Remove loadAtBreak from all experiments
        const experimentResult = await experimentsCollection.updateMany(
            { loadAtBreak: { $exists: true } },
            { $unset: { loadAtBreak: "" } }
        );

        // Remove all loadAtBreak traits
        const traitResult = await traitsCollection.deleteMany({ type: "loadAtBreak" });

        console.log(`Removed loadAtBreak from ${experimentResult.modifiedCount} experiments`);
        console.log(`Removed ${traitResult.deletedCount} loadAtBreak traits`);
        console.log("Migration rollback completed successfully");
    } catch (error) {
        console.error("Error rolling back migration:", error);
    } finally {
        await client.close();
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