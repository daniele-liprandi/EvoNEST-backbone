import { getServerSession } from "next-auth";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new NextResponse(null, { status: 401 });
        }

        const client = await get_or_create_client();
        const users = client.db("usersdb").collection("users");
        const userdb = await users.findOne({ auth0id: session.user.sub });
        
        if (!userdb) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            databases: userdb.databases || [],
            activeDatabase: userdb.activeDatabase
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new NextResponse(null, { status: 401 });
        }

        const { database } = await req.json();
        const client = await get_or_create_client();
        const users = client.db("usersdb").collection("users");
        const userdb = await users.findOne({ auth0id: session.user.sub });

        if (!userdb) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!userdb.databases.includes(database)) {
            return NextResponse.json({ error: "Database not authorized for user" }, { status: 403 });
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

        return NextResponse.json({ success: true, activeDatabase: database });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}