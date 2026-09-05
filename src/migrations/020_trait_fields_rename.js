const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://root:pass@localhost:27017";

// Rename trait.type -> trait.quantity and trait.measurement -> trait.value on the
// traits collection of every NEST database, swap the type_1 index for quantity_1,
// and drop the leftover `method: "create"` field that the parsers used to write
// onto embedded traits (the API path never persisted it).
// Pass { dryRun: true } to report counts without writing.
async function up(testClient = null, options = {}) {
    const isDryRun = options.dryRun ?? process.argv.includes('--dryrun');
    let client = testClient;
    let ownsClient = false;

    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        ownsClient = true;
        console.log('Connected successfully to MongoDB');
    }

    const summary = { databases: 0, typeRenamed: 0, measurementRenamed: 0, methodDropped: 0 };

    try {
        const dbNames = await client.db().admin().listDatabases();
        const relevantDbs = dbNames.databases
            .filter(db => !['admin', 'config', 'local'].includes(db.name));

        console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'}`);

        for (const dbInfo of relevantDbs) {
            const dbName = dbInfo.name;
            if (dbName === 'usersdb') continue;

            const db = client.db(dbName);
            const collections = await db.listCollections().toArray();
            if (!collections.some(col => col.name === 'traits')) {
                console.log(`Database ${dbName} does not have a traits collection, skipping.`);
                continue;
            }

            console.log(`\nProcessing database: ${dbName}`);
            summary.databases++;
            const collection = db.collection('traits');

            const withType = await collection.countDocuments({ type: { $exists: true } });
            const withMeasurement = await collection.countDocuments({ measurement: { $exists: true } });
            const withMethod = await collection.countDocuments({ method: 'create' });
            console.log(`Found ${withType} traits with a 'type' field, ${withMeasurement} with a 'measurement' field, `
                + `${withMethod} with a leftover 'method' field.`);

            summary.typeRenamed += withType;
            summary.measurementRenamed += withMeasurement;
            summary.methodDropped += withMethod;

            if (isDryRun) {
                const indexes = await collection.indexes();
                console.log(`Index type_1 present: ${indexes.some(i => i.name === 'type_1')}; `
                    + `index quantity_1 present: ${indexes.some(i => i.name === 'quantity_1')}.`);
                continue;
            }

            // $rename is atomic and skips documents that lack the field.
            if (withType > 0) {
                const res = await collection.updateMany(
                    { type: { $exists: true } },
                    { $rename: { type: 'quantity' } },
                );
                console.log(`Renamed 'type' to 'quantity' on ${res.modifiedCount} traits.`);
            }
            if (withMeasurement > 0) {
                const res = await collection.updateMany(
                    { measurement: { $exists: true } },
                    { $rename: { measurement: 'value' } },
                );
                console.log(`Renamed 'measurement' to 'value' on ${res.modifiedCount} traits.`);
            }
            if (withMethod > 0) {
                const res = await collection.updateMany(
                    { method: 'create' },
                    { $unset: { method: '' } },
                );
                console.log(`Dropped the leftover 'method' field from ${res.modifiedCount} traits.`);
            }

            const indexes = await collection.indexes();
            if (indexes.some(i => i.name === 'type_1')) {
                await collection.dropIndex('type_1');
                console.log(`Dropped index type_1.`);
            }
            if (!indexes.some(i => i.name === 'quantity_1')) {
                await collection.createIndex({ quantity: 1 });
                console.log(`Created index quantity_1.`);
            }
        }

        if (isDryRun) {
            console.log(`\nDRY RUN SUMMARY: ${summary.typeRenamed} traits would have 'type' renamed to 'quantity', `
                + `${summary.measurementRenamed} would have 'measurement' renamed to 'value', `
                + `${summary.methodDropped} would have a leftover 'method' field dropped.`);
            console.log(`Run without --dryrun to apply.`);
        } else {
            console.log(`\nLIVE RUN SUMMARY: renamed 'type' on ${summary.typeRenamed} traits, `
                + `'measurement' on ${summary.measurementRenamed} traits, dropped 'method' from `
                + `${summary.methodDropped} traits, across ${summary.databases} databases.`);
        }

        return summary;
    } catch (error) {
        console.error("Error applying migration:", error);
        throw error;
    } finally {
        if (ownsClient) {
            await client.close();
        }
    }
}

if (require.main === module) {
    up().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { up };
