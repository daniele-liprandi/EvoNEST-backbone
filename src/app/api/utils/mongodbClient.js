import { MongoClient } from "mongodb";
import { ensureDefaultAdmin } from "./initialiseDb";
import { requireEnv } from "./env";

let client = null;
let clientPromise = null;
let mongodb_client = null;

async function get_or_create_client() {
    if (client != null) {
        return client;
    }

    if (clientPromise != null) {
        return clientPromise;
    }

    if (mongodb_client == null) {
        const uri = requireEnv("MONGODB_URI");
        mongodb_client = new MongoClient(uri);
    }

    clientPromise = mongodb_client.connect()
        .then(async (connectedClient) => {
            client = connectedClient;

            await ensureDefaultAdmin(client);

            return client;
        })
        .catch((e) => {
            console.error(e);
            clientPromise = null;
            return null;
        });

    try {
        return await clientPromise;
    } finally {
        if (client != null) {
            clientPromise = null;
        }
    }
}

export { client, get_or_create_client };
