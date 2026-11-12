const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://root:pass@localhost:27017";

// The demo login and the first-run admin used to get a NEST called "admin",
// which is MongoDB's own admin database. Every migration skips that database,
// so its lab data never got migrated. This moves those collections to a normal
// NEST (default "evonest", or --to=<name>) and points users and the database
// list at it.
//  - each non-system collection in `admin` is renamed into the target database
//    (indexes and GridFS buckets come along)
//  - stops without changing anything if the target already holds any of them
//  - usersdb.users: "admin" in databases/activeDatabase becomes the target
//  - systemdb settings {type: "databases"}: "admin" becomes the target
// Pass { dryRun: true } (or --dryrun) to report the plan without writing.

const SOURCE = 'admin';

const swapName = (list, from, to) => [...new Set((list ?? []).map((d) => (d === from ? to : d)))];

async function up(testClient = null, options = {}) {
    const isDryRun = options.dryRun ?? process.argv.includes('--dryrun');
    const target = options.to ?? process.argv.find((a) => a.startsWith('--to='))?.slice(5) ?? 'evonest';
    let client = testClient;
    let ownsClient = false;

    if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        ownsClient = true;
        console.log('Connected successfully to MongoDB');
    }

    const summary = { moved: [], usersUpdated: 0, databaseListUpdated: false, skipped: null };

    try {
        console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN'}; target: ${target}`);
        const source = client.db(SOURCE);
        const collections = (await source.listCollections({}, { nameOnly: true }).toArray())
            .map((c) => c.name)
            .filter((name) => !name.startsWith('system.'));
        if (collections.length === 0) {
            console.log(`No lab collections in "${SOURCE}"; nothing to move.`);
            summary.skipped = 'empty';
            return summary;
        }

        const existing = new Set(
            (await client.db(target).listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
        );
        const clashes = collections.filter((c) => existing.has(c));
        if (clashes.length > 0) {
            console.log(`"${target}" already has ${clashes.join(', ')}; not merging. Pick another --to.`);
            summary.skipped = 'clash';
            return summary;
        }

        for (const name of collections) {
            const count = await source.collection(name).estimatedDocumentCount();
            console.log(`${isDryRun ? 'Would move' : 'Moving'} ${SOURCE}.${name} (${count} documents) to ${target}.${name}`);
            if (!isDryRun) {
                await client.db('admin').command({ renameCollection: `${SOURCE}.${name}`, to: `${target}.${name}` });
            }
            summary.moved.push(name);
        }

        const users = client.db('usersdb').collection('users');
        const affected = await users.find({ $or: [{ databases: SOURCE }, { activeDatabase: SOURCE }] }).toArray();
        for (const user of affected) {
            console.log(`${isDryRun ? 'Would update' : 'Updating'} user ${user.name ?? user._id}`);
            if (!isDryRun) {
                await users.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            databases: swapName(user.databases, SOURCE, target),
                            ...(user.activeDatabase === SOURCE ? { activeDatabase: target } : {}),
                        },
                    },
                );
            }
        }
        summary.usersUpdated = affected.length;

        const settings = client.db('systemdb').collection('settings');
        const list = await settings.findOne({ type: 'databases' });
        if (list && (list.databases ?? []).includes(SOURCE)) {
            console.log(`${isDryRun ? 'Would replace' : 'Replacing'} "${SOURCE}" with "${target}" in the database list`);
            if (!isDryRun) {
                await settings.updateOne(
                    { _id: list._id },
                    { $set: { databases: swapName(list.databases, SOURCE, target), lastModified: new Date().toISOString() } },
                );
            }
            summary.databaseListUpdated = true;
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
