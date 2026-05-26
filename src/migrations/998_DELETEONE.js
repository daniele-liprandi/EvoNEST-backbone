const { MongoClient } = require('mongodb');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

function getArg(name) {
    const prefix = `${name}=`;
    const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
    return argument ? argument.slice(prefix.length) : null;
}

async function confirmTarget(target) {
    const prompt = readline.createInterface({ input: stdin, output: stdout });
    try {
        const answer = await prompt.question(`Type the collection name to confirm dropping ${target}: `);
        return answer.trim() === target;
    } finally {
        prompt.close();
    }
}

// The 'up' migration function
async function up() {
    const collectionName = getArg('--collection') || process.env.MIGRATION_COLLECTION || 'files';
    const dryRun = process.argv.includes('--dry-run');

    if (dryRun) {
        console.log(`[dry-run] Would drop collection: ${collectionName}`);
        return;
    }

    const confirmed = await confirmTarget(collectionName);
    if (!confirmed) {
        throw new Error('Collection confirmation failed');
    }

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
