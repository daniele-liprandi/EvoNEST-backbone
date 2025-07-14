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

async function copyCollections() {
    await connectClient();
    try {
        const sourceDb = client.db("evonest");
        const targetDb = client.db("demodatabase");

        // Copy "samples" collection
        const samples = await sourceDb.collection("samples").find().toArray();
        if (samples.length > 0) {
            await targetDb.collection("samples").insertMany(samples);
            console.log('Copied samples collection');
        } else {
            console.log('No samples found to copy');
        }

        // Copy "traits" collection
        const traits = await sourceDb.collection("traits").find().toArray();
        if (traits.length > 0) {
            await targetDb.collection("traits").insertMany(traits);
            console.log('Copied traits collection');
        } else {
            console.log('No traits found to copy');
        }

        
        // Copy "experiments" collection
        const experiments = await sourceDb.collection("experiments").find().toArray();
        if (experiments.length > 0) {
            await targetDb.collection("experiments").insertMany(experiments);
            console.log('Copied experiments collection');
        } else {
            console.log('No experiments found to copy');
        }
    } catch (error) {
        console.error("Error copying collections:", error);
    } finally {
        await client.close();
    }
}

copyCollections().catch(console.error);
