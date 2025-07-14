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

        // Fetch all experiments with channelData
        const experiments = await experimentsCollection.find({ channelData: { $exists: true } }).toArray();

        console.log(`Found ${experiments.length} experiments with channelData to migrate`);

        for (let experiment of experiments) {
            // Create a new entry in the rawdata collection
            const rawDataDocument = {
                experimentId: experiment._id,
                data: experiment.channelData[0] // Assuming channelData is an array with one element
            };

            try {
                // Insert the new rawdata document
                const result = await rawdataCollection.insertOne(rawDataDocument);

                if (result.insertedId) {
                    // Remove channelData from the original experiment document
                    await experimentsCollection.updateOne(
                        { _id: experiment._id },
                        { $unset: { channelData: "" } }
                    );
                    console.log(`Migrated channelData for experiment: ${experiment._id}`);
                } else {
                    console.error(`Failed to insert rawdata for experiment: ${experiment._id}`);
                }
            } catch (error) {
                console.error(`Error processing experiment ${experiment._id}:`, error);
            }
        }

        console.log("Migration completed successfully");
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

// Function to revert the migration if needed
async function down() {
    await connectClient();
    try {
        const db = client.db("evonest");
        const experimentsCollection = db.collection("experiments");
        const rawdataCollection = db.collection("rawdata");

        // Fetch all rawdata documents
        const rawDataDocuments = await rawdataCollection.find().toArray();

        for (let rawData of rawDataDocuments) {
            // Move channelData back to the experiment document
            await experimentsCollection.updateOne(
                { _id: rawData.experimentId },
                { $set: { channelData: [rawData.data] } }
            );
        }

        // Remove all documents from the rawdata collection
        await rawdataCollection.deleteMany({});

        console.log("Migration reverted successfully");
    } catch (error) {
        console.error("Error reverting migration:", error);
    } finally {
        await client.close();
    }
}

// Run the migration
up().catch(console.error);

// To revert the migration, you would run:
// down().catch(console.error);