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
        const Collection = db.collection("samples");

        /* // In all logbook entries, change the field `feeded` to `fed`
        const editField = await Collection.updateMany(
            { feeded: { $exists: true } },
            { $rename: { "feeded": "fed" } }
        ); */

        // if species = "caudatus", species = "hispanicus"
        const editField = await Collection.updateMany(
            { species: "caudatus" },
            { $set: { species: "hispanicus" } }
        );
        

        console.log(`${editField.modifiedCount} documents were updated.`);
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);
