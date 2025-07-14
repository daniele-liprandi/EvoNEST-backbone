import { MongoClient } from "mongodb";
import { ensureDefaultAdmin } from "./initialiseDb";

// Setup the MongoDB URI and initialize the MongoClient
const uri = process.env.MONGODB_URI || "mongodb://root:pass@localhost:27019";
const mongodb_client = new MongoClient(uri);

// This variable will hold the instance of the connected client
var client = null;

// Function to get or create a MongoDB client
// The mongodb_client.connect() method is an asynchronous operation. 
// It means this method returns a promise and takes some time to complete, 
// such as establishing a connection to a MongoDB database. 
// This operation doesn't block the execution of further code 
// while waiting for the database connection to be established.
async function get_or_create_client() {
    if (client != null) {
        return client;
    }
    try {
        client = await mongodb_client.connect();

        // Ensure default admin exists after connection is established
        await ensureDefaultAdmin(client);

        return client;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export { client, get_or_create_client };
