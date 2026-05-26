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
        const answer = await prompt.question(`Type the database name to confirm dropping ${target}: `);
        return answer.trim() === target;
    } finally {
        prompt.close();
    }
}

// The 'up' migration function
async function up() {
    const databaseName = getArg('--database') || process.env.MIGRATION_DATABASE;
    const dryRun = process.argv.includes('--dry-run');

    if (!databaseName) {
        throw new Error('Missing --database=<name> for destructive migration');
    }

    if (dryRun) {
        console.log(`[dry-run] Would drop database: ${databaseName}`);
        return;
    }

    const confirmed = await confirmTarget(databaseName);
    if (!confirmed) {
        throw new Error('Database confirmation failed');
    }

    try {
        await client.connect();
        const database = client.db(databaseName);
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
