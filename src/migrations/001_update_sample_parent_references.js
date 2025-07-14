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

        // Update the documents
        await samplesCollection.updateMany(
            { id: { $exists: true } },
            { $rename: { "id": "name" } },
            { $rename: { "note": "notes" } }
        );


        const cursor = samplesCollection.find({});

        while (await cursor.hasNext()) {
            const sample = await cursor.next();
            // Assuming 'parentName' is a field in the sample that references the parent by name
            const parent = await samplesCollection.findOne({ "name": sample.parentId });

            if (parent) {
                await samplesCollection.updateOne({ "_id": sample._id }, { $set: { "parentId": parent._id } });
            }
        }
        console.log("Migration applied successfully");
    } catch (error) {
        console.error("Error applying migration:", error);
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
