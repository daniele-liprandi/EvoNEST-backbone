const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://root:pass@localhost:27017";

// On every NEST database:
//  - rename trait.type -> trait.quantity and trait.measurement -> trait.value,
//    and swap the type_1 index for quantity_1
//  - drop the `method` field from traits, samples, experiments and config, and
//    from usersdb.users. `method` is the POST request verb; the handlers strip
//    it before persisting, but older data (and the parser trait path) kept it,
//    and nothing reads it. Any stored value is a misuse of the name and is
//    removed.
// Pass { dryRun: true } to report counts without writing.

const METHOD_COLLECTIONS = ['traits', 'samples', 'experiments', 'config'];

async function dropMethod(db, collectionNames, name, summary, isDryRun) {
    if (!collectionNames.includes(name)) return;
    const coll = db.collection(name);
    const filter = { method: { $exists: true } };
    const count = await coll.countDocuments(filter);
    if (count === 0) return;
    console.log(`Found ${count} ${db.databaseName}.${name} carrying a stale 'method' field.`);
    summary.methodDropped += count;
    if (!isDryRun) {
        const res = await coll.updateMany(filter, { $unset: { method: '' } });
        console.log(`Dropped 'method' from ${res.modifiedCount} ${db.databaseName}.${name}.`);
    }
}

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
            const collections = (await db.listCollections().toArray()).map(c => c.name);
            if (!collections.includes('traits')) {
                console.log(`Database ${dbName} does not have a traits collection, skipping.`);
                continue;
            }

            console.log(`\nProcessing database: ${dbName}`);
            summary.databases++;
            const traits = db.collection('traits');

            const withType = await traits.countDocuments({ type: { $exists: true } });
            const withMeasurement = await traits.countDocuments({ measurement: { $exists: true } });
            console.log(`Found ${withType} traits with a 'type' field, ${withMeasurement} with a 'measurement' field.`);

            summary.typeRenamed += withType;
            summary.measurementRenamed += withMeasurement;

            // Stale `method` request verb on the NEST collections.
            for (const name of METHOD_COLLECTIONS) {
                await dropMethod(db, collections, name, summary, isDryRun);
            }

            if (isDryRun) {
                const indexes = await traits.indexes();
                console.log(`Index type_1 present: ${indexes.some(i => i.name === 'type_1')}; `
                    + `index quantity_1 present: ${indexes.some(i => i.name === 'quantity_1')}.`);
                continue;
            }

            // $rename is atomic and skips documents that lack the field.
            if (withType > 0) {
                const res = await traits.updateMany(
                    { type: { $exists: true } },
                    { $rename: { type: 'quantity' } },
                );
                console.log(`Renamed 'type' to 'quantity' on ${res.modifiedCount} traits.`);
            }
            if (withMeasurement > 0) {
                const res = await traits.updateMany(
                    { measurement: { $exists: true } },
                    { $rename: { measurement: 'value' } },
                );
                console.log(`Renamed 'measurement' to 'value' on ${res.modifiedCount} traits.`);
            }

            const indexes = await traits.indexes();
            if (indexes.some(i => i.name === 'type_1')) {
                await traits.dropIndex('type_1');
                console.log(`Dropped index type_1.`);
            }
            if (!indexes.some(i => i.name === 'quantity_1')) {
                await traits.createIndex({ quantity: 1 });
                console.log(`Created index quantity_1.`);
            }
        }

        // usersdb sits outside the NEST loop.
        const usersDb = client.db('usersdb');
        const usersCollections = (await usersDb.listCollections().toArray()).map(c => c.name);
        await dropMethod(usersDb, usersCollections, 'users', summary, isDryRun);

        if (isDryRun) {
            console.log(`\nDRY RUN SUMMARY: ${summary.typeRenamed} traits would have 'type' renamed to 'quantity', `
                + `${summary.measurementRenamed} would have 'measurement' renamed to 'value', `
                + `${summary.methodDropped} records would have a stale 'method' field dropped.`);
            console.log(`Run without --dryrun to apply.`);
        } else {
            console.log(`\nLIVE RUN SUMMARY: renamed 'type' on ${summary.typeRenamed} traits, `
                + `'measurement' on ${summary.measurementRenamed} traits, dropped 'method' from `
                + `${summary.methodDropped} records, across ${summary.databases} databases.`);
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
