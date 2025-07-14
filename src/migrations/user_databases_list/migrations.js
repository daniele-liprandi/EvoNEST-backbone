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
        
        // Only find users with database = "demodatabase"
        const cursor = users.find({});
        
        let migratedCount = 0;
        while(await cursor.hasNext()) {
            const user = await cursor.next();
            
            if (!user.databases) {
                const update = {
                    databases: user.database ? [user.database] : [],
                    activeDatabase: user.database
                };

                await users.updateOne(
                    { _id: user._id },
                    { $set: update }
                );

                migratedCount++;
                migrationLog.push({
                    auth0id: user.auth0id,
                    name: user.name,
                    status: 'migrated',
                    before: { database: user.database },
                    after: update
                });
            }
        }

        console.log(`Migration completed successfully. Migrated ${migratedCount} users.`);
        console.log("Migration log:", JSON.stringify(migrationLog, null, 2));
        return migrationLog;

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