const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

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
        const traitsCollection = db.collection("traits");

        // Fetch all traits
        const traits = await traitsCollection.find().toArray();

        // Fetch the traits which still have a field "secondaryItems"
        const traitsWithSecondaryItems = traits.filter(trait => trait.secondaryItems);

        // delete those traits from the database
        for (let trait of traitsWithSecondaryItems) {
            console.log(`Deleting trait ${trait._id}`);
            await traitsCollection.deleteOne({ _id: trait._id });
        }

        console.log("Migration applied successfully");
    } catch (error) {
        console.error("Error applying migration:", error);
    } finally {
        await client.close();
    }
}

up().catch(console.error);
