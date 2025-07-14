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

// The trait types we want to handle
const TRAIT_TYPES = ['modulus', 'strainAtBreak', 'stressAtBreak', 'toughness'];

async function up() {
    await connectClient();
    
    try {
        const db = client.db("evonest");
        const traitsCollection = db.collection("traits");
        const experimentsCollection = db.collection("experiments");


        // First, delete all traits of the specified types
        const deleteResult = await traitsCollection.deleteMany({
            type: { $in: TRAIT_TYPES }
        });
        console.log(`Deleted ${deleteResult.deletedCount} existing traits`);

        // Get all tensile test experiments
        const experiments = await experimentsCollection.find({
            type: 'tensile_test'
        }).toArray();
        console.log(`Found ${experiments.length} tensile test experiments to process`);

        // Create new traits for each experiment
        let createdTraits = 0;
        for (const experiment of experiments) {
            const traitData = [
                {
                    type: 'strainAtBreak',
                    measurement: experiment.strainAtBreak,
                    unit: 'mm/mm'
                },
                {
                    type: 'stressAtBreak',
                    measurement: experiment.stressAtBreak,
                    unit: 'Pa'
                },
                {
                    type: 'toughness',
                    measurement: experiment.toughness,
                    unit: 'Pa'
                },
                {
                    type: 'modulus',
                    measurement: experiment.modulus,
                    unit: 'Pa'
                }
            ];

            // Insert traits only if measurement exists and is not null
            for (const trait of traitData) {
                if (trait.measurement != null) {
                    await traitsCollection.insertOne({
                        ...trait,
                        responsible: experiment.responsible,
                        sampleId: experiment.sampleId,
                        experimentId: experiment.name,
                        date: experiment.date,
                        equipment: "tensile_test"
                    });
                    createdTraits++;
                }
            }
        }

        console.log(`Successfully created ${createdTraits} new traits`);
        console.log("Migration completed successfully");

    } catch (error) {
        console.error("Error applying migration:", error);
        throw error;
    } finally {
        await client.close();
    }
}

// The 'down' migration function (left empty as reverting would be complex)
async function down() {
    console.log("Down migration not implemented");
}

// Execute the migration
up().catch(console.error);

module.exports = { up, down };