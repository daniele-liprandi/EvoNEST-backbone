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

async function up(testClient = null) {
    let client;
    try {
        // Use provided test client or create a new connection
        if (testClient) {
            client = testClient;
        } else {
            client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
            await client.connect();
        }
        
        console.log('Connected successfully to MongoDB');

        const db = client.db("evonest");
        const samplesCollection = db.collection("samples");

        // Update major ampullate variations
        const bridgingResult = await samplesCollection.updateMany(
            { 
                silktype: { 
                    $regex: /.*bridging.*web.*/i 
                }
            },
            { 
                $set: { 
                    silktype: "bridging line" 
                } 
            }
        );


        console.log(`${bridgingResult.modifiedCount} documents were standardized.`);
    } catch (error) {
        console.error("Error standardizing silktypes:", error);
        throw error;
    } finally {
        // Only close if we created our own client
        if (!testClient && client) {
            await client.close();
        }
    }
}

// The 'down' migration function (for rollback if needed)
async function down() {
    console.log("No down migration implemented - string standardization cannot be automatically reversed");
}

// Execute the migration
if (require.main === module) {
    up().catch(console.error);
}

module.exports = { up, down };