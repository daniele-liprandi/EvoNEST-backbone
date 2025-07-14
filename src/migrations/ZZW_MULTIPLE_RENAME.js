const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

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

        // Array to hold the bulk operations
        const bulkOps = [];

        // Find all documents where name contains "Holcau"
        const cursor = await Collection.find({ name: { $regex: /Holcau/ } });

        // Iterate over the cursor
        await cursor.forEach((doc) => {
            const updatedName = doc.name.replace(/Holcau/g, "Holhis");
            console.log(`Updating document _id: ${doc._id}, name: ${doc.name} -> ${updatedName}`);

            // Add the update operation to the bulkOps array
            bulkOps.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { name: updatedName } }
                }
            });
        });

        // Execute the bulk operations if there are any
        if (bulkOps.length > 0) {
            const result = await Collection.bulkWrite(bulkOps);
            console.log(`${result.modifiedCount} documents were updated.`);
        } else {
            console.log("No documents matched the criteria.");
        }
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);
