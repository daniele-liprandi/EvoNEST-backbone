const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

// Function to copy the database
async function copyDatabase(sourceDb, targetDb) {
    const collections = await sourceDb.listCollections().toArray();
    for (const collectionInfo of collections) {
        const sourceCollection = sourceDb.collection(collectionInfo.name);
        const targetCollection = targetDb.collection(collectionInfo.name);
        
        const documents = await sourceCollection.find({}).toArray();
        if (documents.length > 0) {
            await targetCollection.insertMany(documents);
        }
    }
    console.log(`Database copied from ${sourceDb.databaseName} to ${targetDb.databaseName}`);
}

// The 'down' migration function
async function up() {
    try {
        await client.connect();
        const sourceDatabase = client.db("demodatabase_backup");
        const restoredDatabase = client.db("demodatabase");

        // Restore the database
        await copyDatabase(sourceDatabase, restoredDatabase);

        // Optionally, drop the backup database
        // await sourceDatabase.dropDatabase();
        // console.log("Backup database has been dropped.");

        console.log("Database has been restored from backup.");
    } catch (error) {
        console.error("Error in rollback:", error);
    } finally {
        await client.close();
    }
}

// Execute the migration
if (require.main === module) {
    up().catch(console.error);
}

module.exports = { up };