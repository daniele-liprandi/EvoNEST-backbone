import CredentialsProvider from "next-auth/providers/credentials";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { DefaultSession, DefaultUser, NextAuthOptions }  from "next-auth";

// Extend the built-in session types
declare module "next-auth" {
    interface Session {
        user: {
            sub?: string;
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        sub?: string;
        role?: string;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },            
            async authorize(credentials: Record<"username" | "password", string> | undefined): Promise<any> {
                if (credentials?.username === "admin" && credentials?.password === "pass") {
                    const client = await get_or_create_client();
                    const users = client.db("usersdb").collection("users");
                    const demoUserId = 'demo|admin';
                    
                    // Use findOneAndUpdate with upsert to avoid duplicates
                    const result = await users.findOneAndUpdate(
                        { auth0id: demoUserId },
                        {
                            $setOnInsert: {
                                auth0id: demoUserId,
                                name: 'admin',
                                role: 'admin',
                                email: 'admin@demo.com',
                                activeDatabase: 'admin',
                                databases: ['admin'],
                                logbook: [`${new Date().toISOString()}: created demo user`],
                                recentChangeDate: new Date().toISOString()
                            }
                        },
                        { 
                            upsert: true, 
                            returnDocument: 'after' 
                        }
                    );
                    
                    const user = result.value;
                    
                    // HACK to handle the case where upsert doesn't return the document
                    // This can happen if the user was created but not returned by findOneAndUpdate


                    if (!user) {
                        // Fallback to find the user if upsert didn't return the document
                        const foundUser = await users.findOne({ auth0id: demoUserId });
                        if (!foundUser) {
                            console.error('Failed to create or find admin user');
                            return null;
                        }
                        return {
                            id: demoUserId,
                            name: foundUser.name,
                            email: foundUser.email,
                            sub: demoUserId,
                            role: foundUser.role
                        };
                    }
                    
                    return {
                        id: demoUserId,
                        name: user.name,
                        email: user.email,
                        sub: demoUserId,
                        role: user.role
                    };
                }
                return null;
            }
        })
    ],    callbacks: {
        async jwt({ token, user }: { token: any; user: any }) {
            if (user) {
                token.sub = user.sub;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            if (session?.user) {
                session.user.sub = token.sub;
                // You can also add other custom fields here
                // session.user.role = token.role;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout',
        error: '/auth/error',
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    }
};