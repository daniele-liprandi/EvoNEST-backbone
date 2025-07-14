// add_note_when_dead
const { MongoClient } = require('mongodb');

// MongoDB Connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function up(testClient = null, referenceDate = new Date(), dbName = "test") {
    let client;
    try {
        // Use provided test client or create a new connection
        if (testClient) {
            client = testClient;
        } else {
            client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
            await client.connect();
        }

        const db = client.db(dbName);
        const samplesCollection = db.collection("samples");

        // Create start and end of the cutoff date
        const startOfDay = new Date(referenceDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(referenceDate);
        endOfDay.setHours(23, 59, 59, 999);

        // First, count total matching samples before any filtering
        const totalMatching = await samplesCollection.countDocuments({
            logbook: {
                $elemMatch: {
                    0: {
                        $gte: startOfDay.toISOString(),
                        $lte: endOfDay.toISOString()
                    },
                    1: { $regex: "Set lifestatus.*to preserved" }
                }
            }
        });

        // Count samples that already have the death note
        const alreadyHaveNote = await samplesCollection.countDocuments({
            logbook: {
                $elemMatch: {
                    0: {
                        $gte: startOfDay.toISOString(),
                        $lte: endOfDay.toISOString()
                    },
                    1: { $regex: "Set lifestatus.*to preserved" }
                }
            },
            notes: { $regex: "Time of death unknown" }
        });

        const result = await samplesCollection.updateMany(
            {
                logbook: {
                    $elemMatch: {
                        0: {
                            $gte: startOfDay.toISOString(),
                            $lte: endOfDay.toISOString()
                        },
                        1: { $regex: "Set lifestatus.*to preserved" }
                    }
                },
                $or: [
                    { notes: null },
                    { notes: { $not: /Time of death unknown/ } }
                ]
            },
            [
                {
                    $set: {
                        notes: {
                            $cond: {
                                if: { $eq: ["$notes", null] },
                                then: "Time of death unknown",
                                else: {
                                    $concat: ["$notes", ". Time of death unknown"]
                                }
                            }
                        },
                        recentChangeDate: new Date().toISOString(),
                        logbook: {
                            $concatArrays: [
                                "$logbook",
                                [[new Date().toISOString(), "Added death note through migration"]]
                            ]
                        }
                    }
                }
            ]
        );

        console.log(`Migration results:
            - Total preserved samples in date range: ${totalMatching}
            - Samples already containing death note: ${alreadyHaveNote}
            - Samples updated with new death note: ${result.modifiedCount}
            - Samples with errors: ${totalMatching - alreadyHaveNote - result.modifiedCount}
            `);
    } catch (error) {
        console.error("Error updating sample notes:", error);
        throw error;
    } finally {
        // Only close if we created our own client
        if (!testClient && client) {
            await client.close();
        }
    }
}

// The 'down' migration function (reverts the 'up' migration)
async function down() {
    console.log("No down migration implemented - notes would need manual review to safely remove");
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const date = args[0] ? new Date(args[0]) : new Date();
    const database = args[1] || "test";
    
    console.log(`Running migration with:
- Reference Date: ${date.toISOString()}
- Database: ${database}
`);
    
    up(null, date, database).catch(console.error);
}

module.exports = { up, down };