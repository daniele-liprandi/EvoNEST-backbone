const { MongoClient } = require('mongodb');

async function validateUser(user) {
    if (!Array.isArray(user.databases)) {
        throw new Error(`User ${user.auth0id} has invalid databases field`);
    }
    if (!user.activeDatabase) {
        throw new Error(`User ${user.auth0id} missing activeDatabase`);
    }
    if (!user.databases.includes(user.activeDatabase)) {
        throw new Error(`User ${user.auth0id} activeDatabase not in databases array`);
    }
}

async function migrateUsers() {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    const migrationLog = [];

    try {
        await client.connect();
        const users = client.db("usersdb").collection("users");
        
        // add the following databases to the list
        const databases_to_be_added = ["landau"];

        const add_databases = await users.updateMany(
            { databases: { $exists: true }, name: "Jonas Wolff" },
            { $addToSet: { databases: { $each: databases_to_be_added } } }
        );

        if (add_databases.modifiedCount === 0) {
            console.log("No users were updated.");
            return;
        } else {
            console.log(`${add_databases.modifiedCount} users were updated.`);
        }

    } catch (error) {
        console.error("Migration failed:", error);
        throw error;
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    migrateUsers().catch(console.error);
}

module.exports = { migrateUsers, validateUser };