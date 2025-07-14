import { getServerSession } from "next-auth";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function get_database_user() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Not authenticated');
    }

    const client = await get_or_create_client();
    const users = client.db("usersdb").collection("users");
    let userdb = await users.findOne({ auth0id: session.user.sub });

    if (!userdb) {
        throw new Error(`User ${session.user.sub} not found`);
    }

    return userdb.activeDatabase;
}

export async function get_user_databases() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Not authenticated');
    }

    const client = await get_or_create_client();
    const users = client.db("usersdb").collection("users");
    let userdb = await users.findOne({ auth0id: session.user.sub });

    if (!userdb) {
        return [];
    }

    return userdb.databases || [];
}

export async function set_active_database(database) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Not authenticated');
    }

    const client = await get_or_create_client();
    const users = client.db("usersdb").collection("users");
    let userdb = await users.findOne({ auth0id: session.user.sub });

    if (!userdb) {
        throw new Error(`User ${session.user.sub} not found`);
    }

    if (!userdb.databases.includes(database)) {
        throw new Error(`Database ${database} not authorized for user ${session.user.sub}`);
    }

    await users.updateOne(
        { auth0id: session.user.sub },
        { 
            $set: { 
                activeDatabase: database,
                recentChangeDate: new Date().toISOString()
            },
            $push: { 
                logbook: `${new Date().toISOString()}: changed active database to ${database}`
            }
        }
    );
}

export async function get_name_authuser() {
    const session = await getServerSession(authOptions);
    return session?.user?.name || null;
}

export async function get_current_user() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Not authenticated');
    }

    const client = await get_or_create_client();
    const users = client.db("usersdb").collection("users");
    let userdb = await users.findOne({ auth0id: session.user.sub });

    if (!userdb) {
        throw new Error(`User ${session.user.sub} not found`);
    }

    return userdb;
}

export async function check_user_role(requiredRole) {
    try {
        const user = await get_current_user();
        return user.role === requiredRole;
    } catch (error) {
        return false;
    }
}