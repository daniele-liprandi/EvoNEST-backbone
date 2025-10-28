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
        const typesCollection = db.collection("types");

        console.log('Adding dataType field to existing trait types...');

        const quantitativeUpdate = await typesCollection.updateMany(
            {
                category: "trait",
            },
            {
                $set: { dataType: "quantitative" }
            }
        );

        console.log(`${quantitativeUpdate.modifiedCount} quantitative trait types updated with dataType field.`);

    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);
