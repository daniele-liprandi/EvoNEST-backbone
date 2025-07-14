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
// The 'up' migration function
async function up() {
    await connectClient();

    try {
        const db = client.db("evonest");
        const samplesCollection = db.collection("samples");

        const tagsToSilkType = [
            "dragline", "prey wrap", "intercepted prey wrap", "tangle web", 
            "gumfoot", "eggsac", "manual collection", "bridging web", "aciniform",
        ];

        for (const tag of tagsToSilkType) {
            const result = await samplesCollection.updateMany(
                { tag: tag },
                { $set: { silktype: tag } }
            );
            console.log(`Updated ${result.modifiedCount} documents with tag '${tag}' to silktype '${tag}'.`);
        }
    } catch (error) {
        console.error("Error updating silktype based on tag:", error);
    } finally {
        await client.close();
    }
}

// The 'down' migration function (reverts the 'up' migration)
async function down() {

}

// Execute the migration
up().catch(console.error);

module.exports = { up, down };
