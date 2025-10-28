# Setting Up Google OAuth Authentication

This guide walks you through replacing the default credentials authentication with Google OAuth, providing a secure and user-friendly login experience.

## Why Use Google OAuth?

**Benefits:**
- ✅ No password management needed
- ✅ Two-factor authentication built-in
- ✅ Users can sign in with existing Google accounts
- ✅ Automatic email verification
- ✅ Easy to set up and maintain

**Considerations:**
- Users must have a Google account
- Requires internet connectivity
- Data flows through Google's authentication servers

---

## Prerequisites

Before starting:
- ✅ EvoNEST installed and running
- ✅ Admin access to your EvoNEST instance
- ✅ A Google account
- ✅ Text editor for code changes

**Estimated Time:** 30 minutes

---

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console

1. Visit: [https://console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account

### 1.2 Create a New Project

1. Click the project dropdown at the top
2. Click **"New Project"**
3. Enter project details:
   - **Project Name:** `EvoNEST Authentication`
   - **Organization:** Select if applicable
4. Click **"Create"**
5. Wait for project creation (30 seconds)

### 1.3 Enable Google+ API

1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for: `Google+ API`
3. Click on **"Google+ API"**
4. Click **"Enable"**

### 1.4 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**

2. Choose user type:
   - **Internal:** Only for Google Workspace users in your organization
   - **External:** For anyone with a Google account (recommended)

3. Click **"Create"**

4. Fill in App Information:
   - **App name:** `EvoNEST`
   - **User support email:** Your email
   - **App logo:** (optional) Upload EvoNEST logo
   - **Application home page:** Your EvoNEST URL (e.g., `https://evonest.yourdomain.com`)
   - **Authorized domains:** Your domain (e.g., `yourdomain.com`)
   - **Developer contact email:** Your email

5. Click **"Save and Continue"**

6. **Scopes:** Click **"Add or Remove Scopes"**
   - Select: `openid`
   - Select: `email`
   - Select: `profile`
   - Click **"Update"** → **"Save and Continue"**

7. **Test users** (if External):
   - Add email addresses of users who can test
   - Click **"Add Users"**
   - Click **"Save and Continue"**

8. Review and click **"Back to Dashboard"**

### 1.5 Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**

2. Click **"Create Credentials"** → **"OAuth client ID"**

3. Configure:
   - **Application type:** Web application
   - **Name:** `EvoNEST Web Client`

4. **Authorized JavaScript origins:**
   - Add: `http://localhost:3005` (for development)
   - Add: `https://your-production-domain.com` (for production)

5. **Authorized redirect URIs:**
   - Add: `http://localhost:3005/api/auth/callback/google` (development)
   - Add: `https://your-production-domain.com/api/auth/callback/google` (production)

6. Click **"Create"**

7. **Save your credentials!**
   - **Client ID:** `123456789-abc...apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-abc123...`

::: danger Keep These Secret!
Never commit these credentials to git. Store them securely in environment variables only.
:::

---

## Step 2: Update Environment Variables

Add Google OAuth credentials to your environment files.

### 2.1 Update `.env.local`

Open `.env.local` and add:

```txt
NEXTAUTH_SECRET=your-existing-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123...
```

### 2.2 Update `.env.development`

```txt
NEXTAUTH_URL=http://localhost:3005
MONGODB_URI=mongodb://evonest_user:your_password@mongo_dev:27017
STORAGE_PATH='/usr/evonest/file_storage_dev'

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123...
```

### 2.3 Update `.env.production` (for production)

```txt
NEXTAUTH_URL=https://your-production-domain.com
MONGODB_URI=mongodb://evonest_user:your_password@mongo:27017
STORAGE_PATH='/usr/evonest/file_storage'

# Google OAuth
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
```

::: tip Use Different Credentials for Production
It's recommended to create separate OAuth credentials for production and development environments.
:::

---

## Step 3: Update NextAuth Configuration

Now we'll modify the NextAuth options to use Google OAuth.

### 3.1 Open the Options File

Open: `src/app/api/auth/[...nextauth]/options.ts`

### 3.2 Import Google Provider

At the top of the file, add the Google provider import:

```typescript{2}
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { DefaultSession, DefaultUser, NextAuthOptions }  from "next-auth";
```

### 3.3 Add Google Provider to Providers Array

Replace the `providers` array with:

```typescript
providers: [
    GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
            params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code"
            }
        }
    }),
    // Keep CredentialsProvider for backward compatibility (optional)
    CredentialsProvider({
        name: "Credentials",
        credentials: {
            username: { label: "Username", type: "text" },
            password: { label: "Password", type: "password" }
        },
        async authorize(credentials: Record<"username" | "password", string> | undefined): Promise<any> {
            // ... existing credentials code ...
            if (credentials?.username === "admin" && credentials?.password === "pass") {
                const client = await get_or_create_client();
                const users = client.db("usersdb").collection("users");
                const demoUserId = 'demo|admin';

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

                if (!user) {
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
],
```

::: tip Remove Credentials Provider
Once Google OAuth is working, you can remove the `CredentialsProvider` block entirely for better security.
:::

### 3.4 Update Callbacks

Add a `signIn` callback to create/update user records in your database:

```typescript{2-26}
callbacks: {
    async signIn({ user, account, profile }) {
        if (account?.provider === "google") {
            try {
                const client = await get_or_create_client();
                const users = client.db("usersdb").collection("users");

                // Create or update user in database
                await users.findOneAndUpdate(
                    { auth0id: user.id },
                    {
                        $set: {
                            name: user.name,
                            email: user.email,
                            recentChangeDate: new Date().toISOString()
                        },
                        $setOnInsert: {
                            auth0id: user.id,
                            role: 'user', // Default role
                            activeDatabase: 'admin',
                            databases: ['admin'],
                            logbook: [`${new Date().toISOString()}: user created via Google OAuth`]
                        }
                    },
                    { upsert: true }
                );

                return true;
            } catch (error) {
                console.error('Error creating/updating user:', error);
                return false;
            }
        }
        return true;
    },
    async jwt({ token, user, account }) {
        if (user) {
            token.sub = user.id;
            token.role = user.role;
        }
        return token;
    },
    async session({ session, token }) {
        if (session?.user) {
            session.user.sub = token.sub;
        }
        return session;
    }
},
```

---

## Step 4: Update Docker Configuration (Optional)

If you need to pass environment variables to Docker:

### 4.1 Update `docker-compose.dev.yml`

```yaml{7-8}
services:
  node:
    # ... other config ...
    env_file:
      - .env.development
      - .env.local
    environment:
      # ... existing vars ...
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
```

---

## Step 5: Test Google OAuth

### 5.1 Restart EvoNEST

```bash
docker compose -f docker-compose.dev.yml restart
```

Or if not using Docker:
```bash
npm run dev
```

### 5.2 Test the Login

1. Go to: [http://localhost:3005](http://localhost:3005)

2. You should now see:
   - **"Sign in with Google"** button
   - (Optional) **"Sign in with Credentials"** if you kept it

3. Click **"Sign in with Google"**

4. You'll be redirected to Google's login page

5. Sign in with your Google account

6. **Grant permissions** when prompted

7. You should be redirected back to EvoNEST, logged in!

### 5.3 Verify User Was Created

1. Check the database using Mongo Express: [http://localhost:8081](http://localhost:8081)

2. Go to `usersdb` → `users` collection

3. You should see a new user entry with:
   - `auth0id`: Your Google user ID
   - `email`: Your Google email
   - `name`: Your Google name

---

## Step 6: Customize User Roles (Optional)

By default, new Google users get the `user` role. You might want to customize this.

### Option A: Admin Approval System

1. Set initial role to `pending`:
   ```typescript
   role: 'pending'
   ```

2. Create an admin page to approve users

3. Update roles manually in database

### Option B: Domain-Based Auto-Approval

Allow users from your organization's domain automatically:

```typescript{6-8}
async signIn({ user, account, profile }) {
    if (account?.provider === "google") {
        try {
            const client = await get_or_create_client();
            const users = client.db("usersdb").collection("users");

            // Check if email is from your organization
            const isOrgEmail = user.email?.endsWith('@yourdomain.com');
            const defaultRole = isOrgEmail ? 'user' : 'pending';

            await users.findOneAndUpdate(
                { auth0id: user.id },
                {
                    $set: {
                        name: user.name,
                        email: user.email,
                        recentChangeDate: new Date().toISOString()
                    },
                    $setOnInsert: {
                        auth0id: user.id,
                        role: defaultRole,
                        activeDatabase: 'admin',
                        databases: ['admin'],
                        logbook: [`${new Date().toISOString()}: user created via Google OAuth`]
                    }
                },
                { upsert: true }
            );

            return isOrgEmail; // Only allow org emails
        } catch (error) {
            console.error('Error creating/updating user:', error);
            return false;
        }
    }
    return true;
}
```

---

## Troubleshooting

### Problem: "Redirect URI mismatch" error

**Cause:** The redirect URI in your Google Console doesn't match exactly.

**Solution:**
1. Check the error message for the exact URI being used
2. Go to Google Cloud Console → Credentials
3. Edit your OAuth client
4. Add the exact URI shown in the error message
5. Save and try again

### Problem: "Access blocked: EvoNEST has not completed Google verification"

**Cause:** Your app is in testing mode and user isn't added as test user.

**Solution:**
- Add user as test user in OAuth consent screen, OR
- Publish your app (requires verification for production)

### Problem: User created but can't access features

**Cause:** User might not have correct databases assigned.

**Solution:**
1. Go to Mongo Express → `usersdb` → `users`
2. Find the user document
3. Update `databases` array: `["admin"]`
4. Update `activeDatabase`: `"admin"`
5. User needs to log out and back in

### Problem: Google sign-in button doesn't appear

**Solutions:**
1. Check environment variables are set:
   ```bash
   # Windows
   type .env.local

   # Mac/Linux
   cat .env.local
   ```

2. Restart the application

3. Check browser console for errors (F12)

4. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

---

## Security Best Practices

1. **Never commit credentials**
   - Add `.env.local` to `.gitignore`
   - Keep credentials in environment variables only

2. **Use HTTPS in production**
   - Google OAuth requires HTTPS for production
   - Set up SSL certificate (Let's Encrypt)

3. **Rotate secrets regularly**
   - Change `NEXTAUTH_SECRET` periodically
   - Regenerate OAuth credentials if compromised

4. **Limit OAuth scopes**
   - Only request necessary permissions (email, profile)
   - Don't request calendar, drive, etc. unless needed

5. **Set up error monitoring**
   - Log authentication failures
   - Monitor for unusual patterns

6. **Review user permissions**
   - Regularly audit user roles
   - Remove access for inactive users

---

## Production Deployment

### Additional Steps for Production

1. **Create production OAuth credentials**
   - Separate client ID/secret for production
   - Use your production domain

2. **Update `.env.production`**
   ```txt
   NEXTAUTH_URL=https://your-domain.com
   GOOGLE_CLIENT_ID=your-production-id
   GOOGLE_CLIENT_SECRET=your-production-secret
   ```

3. **Set up HTTPS**
   - Required for Google OAuth in production
   - Use Let's Encrypt or your certificate provider

4. **Update redirect URIs**
   - Add production domain to Google Console
   - `https://your-domain.com/api/auth/callback/google`

5. **Test thoroughly**
   - Test login flow
   - Test user creation
   - Test permissions

---

## Next Steps

- **[Set up EU-Compliant Auth](/user-docs/auth-eu-compliant)** - For GDPR compliance
- **[User Management](/user-docs/user-account)** - Managing user roles and permissions
- **[Security Best Practices](/user-docs/security)** - Hardening your installation

---

## Complete Code Example

Here's the complete `options.ts` file with Google OAuth:

::: details Click to see full code
```typescript
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { DefaultSession, DefaultUser, NextAuthOptions }  from "next-auth";

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
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google") {
                try {
                    const client = await get_or_create_client();
                    const users = client.db("usersdb").collection("users");

                    await users.findOneAndUpdate(
                        { auth0id: user.id },
                        {
                            $set: {
                                name: user.name,
                                email: user.email,
                                recentChangeDate: new Date().toISOString()
                            },
                            $setOnInsert: {
                                auth0id: user.id,
                                role: 'user',
                                activeDatabase: 'admin',
                                databases: ['admin'],
                                logbook: [`${new Date().toISOString()}: user created via Google OAuth`]
                            }
                        },
                        { upsert: true }
                    );

                    return true;
                } catch (error) {
                    console.error('Error creating/updating user:', error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                session.user.sub = token.sub as string;
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
        maxAge: 30 * 24 * 60 * 60,
    }
};
```
:::
