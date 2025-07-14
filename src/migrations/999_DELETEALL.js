const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

// The 'up' migration function
async function up() {
    try {
        await client.connect();
        const database = client.db("demodatabase_backup_2");
        await database.dropDatabase();
        console.log("Database has been dropped.");
    } catch (error) {
        console.error("Error dropping database:", error);
    } finally {
        await client.close();
    }
}

// Execute the migration
up().catch(console.error);

module.exports = { up };
