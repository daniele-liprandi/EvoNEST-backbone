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
        const experimentCollection = db.collection("experiments");

        // Update experiments with non-empty modulus field
        const updateResult = await experimentCollection.updateMany(
            { modulus: { $exists: true, $ne: "" } },
            { $set: { type: "tensile_test" } }
        );

        console.log(`${updateResult.modifiedCount} experiments were updated to type 'tensile_test'.`);
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);