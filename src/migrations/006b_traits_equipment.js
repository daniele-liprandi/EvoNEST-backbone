const { MongoClient } = require('mongodb');
const { type } = require('os');

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

        // take only the diameters
        const equipmentdiameter = await collection.updateMany(
            { type: { $in: ["diameter", "diametre"] } },
            { $set: { equipment: "optical_microscope" } }
        );

        console.log(`${equipmentdiameter.modifiedCount} documents were updated.`);
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);
