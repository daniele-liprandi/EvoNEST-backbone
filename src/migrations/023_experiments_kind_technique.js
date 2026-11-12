const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://root:pass@localhost:27017";

// On every NEST database, for the experiments collection:
//  - rename experiment.type -> experiment.technique. `type` was doing two jobs
//    across collections; `technique` names what produced the data and is the
//    word protocol steps use too.
//  - backfill kind: "measurement" and parentId: null. Every existing row is a
//    standalone measurement; protocol experiments arrive later and carry their
//    own kind.
//  - create the kind_1_parentId_1 and technique_1 indexes.
// Pass { dryRun: true } (or --dryrun) to report counts without writing.

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

    const summary = { databases: 0, typeRenamed: 0, kindSet: 0, parentIdSet: 0 };

    try {
        const dbNames = await client.db().admin().listDatabases();
        const relevantDbs = dbNames.databases
            .filter(db => !['admin', 'config', 'local', 'usersdb'].includes(db.name));

        console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'}`);

        for (const dbInfo of relevantDbs) {
            const db = client.db(dbInfo.name);
            const collections = (await db.listCollections().toArray()).map(c => c.name);
            if (!collections.includes('experiments')) {
                console.log(`Database ${dbInfo.name} does not have an experiments collection, skipping.`);
                continue;
            }

            console.log(`\nProcessing database: ${dbInfo.name}`);
            summary.databases++;
            const experiments = db.collection('experiments');

            const withType = await experiments.countDocuments({ type: { $exists: true } });
            const withoutKind = await experiments.countDocuments({ kind: { $exists: false } });
            const withoutParent = await experiments.countDocuments({ parentId: { $exists: false } });
            console.log(`Found ${withType} experiments with a 'type' field, ${withoutKind} without 'kind', `
                + `${withoutParent} without 'parentId'.`);
            summary.typeRenamed += withType;
            summary.kindSet += withoutKind;
            summary.parentIdSet += withoutParent;

            if (isDryRun) continue;

            // $rename is atomic and skips documents that lack the field.
            if (withType > 0) {
                const res = await experiments.updateMany({ type: { $exists: true } }, { $rename: { type: 'technique' } });
                console.log(`Renamed 'type' to 'technique' on ${res.modifiedCount} experiments.`);
            }
            if (withoutKind > 0) {
                const res = await experiments.updateMany({ kind: { $exists: false } }, { $set: { kind: 'measurement' } });
                console.log(`Set kind 'measurement' on ${res.modifiedCount} experiments.`);
            }
            if (withoutParent > 0) {
                const res = await experiments.updateMany({ parentId: { $exists: false } }, { $set: { parentId: null } });
                console.log(`Set parentId null on ${res.modifiedCount} experiments.`);
            }

            await experiments.createIndex({ kind: 1, parentId: 1 });
            await experiments.createIndex({ technique: 1 });
        }

        if (isDryRun) {
            console.log(`\nDRY RUN SUMMARY: ${summary.typeRenamed} experiments would have 'type' renamed to 'technique', `
                + `${summary.kindSet} would get kind 'measurement', ${summary.parentIdSet} would get parentId null.`);
            console.log(`Run without --dryrun to apply.`);
        } else {
            console.log(`\nLIVE RUN SUMMARY: renamed 'type' on ${summary.typeRenamed} experiments, set kind on `
                + `${summary.kindSet}, set parentId on ${summary.parentIdSet}, across ${summary.databases} databases.`);
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
