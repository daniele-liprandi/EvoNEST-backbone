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
            { collectiondate: { $exists: true } },
            { $rename: { "collectiondate": "date" } }
        );
        
        await samplesCollection.updateMany(
            { parent_id: { $exists: true } },
            { $rename: { "parent_id": "parentId" } }
        );
        
        await samplesCollection.updateMany(
            { responsible_id: { $exists: true } },
            { $rename: { "responsible_id": "responsible" } }
        );

        await samplesCollection.updateMany(
            { recentChangeDate: { $exists: false } },
            { $rename: { "uploaddate": "recentChangeDate" } }
        );

        await samplesCollection.updateMany(
            { sample_class: { $exists: true } },
            { $rename: { "sample_class": "type" } }
        );

        await samplesCollection.updateMany(
            { life_stage: { $exists: true } },
            { $rename: { "life_stage": "lifestage" } }
        );

        const cursor = samplesCollection.find({});
        while (await cursor.hasNext()) {
            const sample = await cursor.next();

            if (sample.secondaryItems && sample.secondaryItems.length > 0) {
                const { life_stage, sex } = sample.secondaryItems[0]; // Assuming there's only one item in secondaryItems

                // Update the document
                await samplesCollection.updateOne({ _id: sample._id }, {
                    $set: { life_stage, sex },
                    $unset: { secondaryItems: "" }
                });
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
