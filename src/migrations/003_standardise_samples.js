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

        // Update documents where type is "individualsample" or "animal" to "animal"
        const resultanimal = await samplesCollection.updateMany(
            { type: { $in: ["individualsample", "animal"] } },
            { $set: { type: "animal" } }
        );

        // Update documents where type is "silksample" or "silk" to "silk"
        const resultsilk = await samplesCollection.updateMany(
            { type: { $in: ["silksample", "silk"] } },
            { $set: { type: "silk" } }
        );

        

        console.log(`${resultanimal.modifiedCount} animal documents were updated.`);
        console.log(`${resultsilk.modifiedCount} silk documents were updated.`);
    } catch (error) {
        console.error("Error standardizing sample type:", error);
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
