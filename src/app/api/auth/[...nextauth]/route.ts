import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { authOptions } from "./options";

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


const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };