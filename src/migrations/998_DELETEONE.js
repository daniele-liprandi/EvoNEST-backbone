const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

const collectionName = "files";
// The 'up' migration function
async function up() {
    try {
        await client.connect();
        const database = client.db("");
        // Ask for terminal confirmation before dropping the collection
        console.log(`Dropping '${collectionName}' collection...`);
        
        await database.collection(collectionName).drop();
        console.log(`Dropped '${collectionName}' collection`);
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await client.close();
    }
}

// Execute the migration
up().catch(console.error);

module.exports = { up };
