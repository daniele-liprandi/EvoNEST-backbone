const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

// define user details
const user = {
    name: "John Seifert",
    email: "john.seifert@stud.uni-greifswald.de",
    role: "student",
    activeDatabase: "evonext",
    databases: ["evonext"]
};

// add the user to the database
async function up() {
    try {
        await client.connect();
        const db = client.db("usersdb");

        const users = db.collection("users");
        const result = await users.insertOne(user);

        console.log("User added to the database:", result.insertedId);


    } catch (error) {
        console.error("Error in migration:", error);
    } finally {
        await client.close();
    }
}

// The 'down' migration function
async function down() {
    try {
        await client.connect();
        const db = client.db("usersdb");

        const users = db.collection("users");
        const result = await users.deleteOne({ email: user.email });

        console.log("User removed from the database:", result.deletedCount);

    } catch (error) {
        console.error("Error in rollback:", error);
    }   
}

// Execute the migration and have optional flag for down
if (require.main === module) {
    const args = process.argv.slice(1);
    const updown = args[1] || "up";

    console.log(updown);
    
    if (updown === "up") up().catch(console.error);
    if (updown === "down") down().catch(console.error);
}

module.exports = { up, down };