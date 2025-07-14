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
        const collection = db.collection("traits");

        const unitdiameter = await collection.updateMany(
            { type: { $in: ["diameter", "diametre"] } },
            { $set: { unit: "um" } }
        );

        const unitmass = await collection.updateMany(
            { type: { $in: ["body_mass", "weight"] } },
            { $set: { unit: "g" } }
        );

        console.log(`${unitdiameter.modifiedCount} diameter documents were updated.`);
        console.log(`${unitmass.modifiedCount} mass documents were updated.`);
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);
