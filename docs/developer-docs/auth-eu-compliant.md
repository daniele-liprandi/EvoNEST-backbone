# EU-Compliant Authentication Setup

This guide shows you how to set up authentication that complies with EU regulations (GDPR, Data Protection Directives) using **Keycloak**, an open-source identity and access management solution.

## Why EU-Compliant Authentication?

**GDPR Requirements:**

- ✅ Data sovereignty - Keep authentication data in EU
- ✅ User consent management
- ✅ Right to be forgotten
- ✅ Data portability
- ✅ Privacy by design

**Keycloak Benefits:**

- ✅ Open-source and self-hosted
- ✅ Full control over user data
- ✅ EU data residency compliant
- ✅ Built-in GDPR features
- ✅ Supports multiple protocols (OAuth 2.0, OpenID Connect, SAML)
- ✅ User federation (LDAP, Active Directory)
- ✅ Two-factor authentication
- ✅ Single Sign-On (SSO)

---

## Prerequisites

Before starting:

- ✅ EvoNEST installed and running
- ✅ Docker installed (for Keycloak)
- ✅ Admin access to your server
- ✅ Domain name (for production)

**Estimated Time:** 60-90 minutes

---

## Architecture Overview

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│   EvoNEST (Next.js)             │
│   - NextAuth.js                 │
│   - Keycloak Provider           │
└──────┬──────────────────────────┘
       │ OpenID Connect
       ↓
┌─────────────────────────────────┐
│   Keycloak Server               │
│   - User Management             │
│   - Authentication              │
│   - OAuth 2.0 / OpenID Connect  │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────────────────────────┐
│   PostgreSQL (Keycloak DB)      │
│   - User data                   │
│   - Credentials                 │
│   - Sessions                    │
└─────────────────────────────────┘
```

---

## Part 1: Setting Up Keycloak

### Step 1: Install Keycloak with Docker

We'll run Keycloak in a Docker container alongside EvoNEST.

#### 1.1 Create Keycloak Configuration

Create a new file: `docker-compose.keycloak.yml`

```yaml
version: "3.8"

services:
  postgres-keycloak:
    image: postgres:15-alpine
    container_name: evonest_keycloak_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak_db_password_change_me
    volumes:
      - keycloak_postgres_data:/var/lib/postgresql/data
    networks:
      - evonest_network

  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    container_name: evonest_keycloak
    restart: unless-stopped
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres-keycloak:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak_db_password_change_me
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8080
      KC_HTTP_ENABLED: true
      KC_HOSTNAME_STRICT_HTTPS: false
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: change_me_admin_password
    ports:
      - "8080:8080"
    depends_on:
      - postgres-keycloak
    networks:
      - evonest_network

networks:
  evonest_network:
    driver: bridge

volumes:
  keycloak_postgres_data:
```

::: danger Change Default Passwords!
Replace `keycloak_db_password_change_me` and `change_me_admin_password` with strong passwords!
:::

#### 1.2 Start Keycloak

```bash
docker compose -f docker-compose.keycloak.yml up -d
```

**Wait for startup** (1-2 minutes). Watch logs:

```bash
docker compose -f docker-compose.keycloak.yml logs -f keycloak
```

Look for:

```
Keycloak 23.0.0 started in Xms.
```

#### 1.3 Access Keycloak Admin Console

1. Open browser: [http://localhost:8080](http://localhost:8080)

2. Click **"Administration Console"**

3. Login with:
   - **Username:** `admin`
   - **Password:** Your admin password from docker-compose file

---

### Step 2: Configure Keycloak Realm

A "realm" is a isolated space for managing users and applications.

#### 2.1 Create a New Realm

1. Hover over **"Master"** (top-left dropdown)

2. Click **"Create Realm"**

3. Configure:

   - **Realm name:** `evonest`
   - **Enabled:** ✅

4. Click **"Create"**

#### 2.2 Configure Realm Settings

1. Go to **"Realm settings"** (left sidebar)

2. **General tab:**

   - **Display name:** `EvoNEST`
   - **HTML Display name:** `<b>EvoNEST</b> Authentication`
   - **User-managed access:** ✅ (GDPR - allows users to manage their data)
   - **Endpoints:** Note the OpenID Endpoint Configuration URL

3. **Login tab:**

   - **User registration:** ✅ (if you want users to self-register)
   - **Forgot password:** ✅
   - **Remember me:** ✅
   - **Email as username:** ✅ (recommended)
   - **Require SSL:** external requests (for production, change to "all requests")

4. **Email tab** (important for user verification):

   - **From:** `noreply@your-domain.com`
   - **Host:** Your SMTP server
   - **Port:** 587 (or your SMTP port)
   - **Username:** Your SMTP username
   - **Password:** Your SMTP password
   - **Enable SSL:** ✅
   - **Enable StartTLS:** ✅

5. **Themes tab:**

   - Customize login page appearance (optional)

6. Click **"Save"**

#### 2.3 Test Email Configuration (Optional)

1. Scroll to **Email** tab
2. Click **"Test connection"**
3. Enter test email
4. Check email inbox

---

### Step 3: Create OAuth Client for EvoNEST

#### 3.1 Create Client

1. Go to **"Clients"** (left sidebar)

2. Click **"Create client"**

3. **General Settings:**

   - **Client type:** OpenID Connect
   - **Client ID:** `evonest-app`
   - Click **"Next"**

4. **Capability config:**

   - **Client authentication:** ON
   - **Authorization:** OFF
   - **Standard flow:** ✅ (OAuth 2.0 Authorization Code Flow)
   - **Direct access grants:** ✅
   - Click **"Next"**

5. **Login settings:**

   - **Root URL:** `http://localhost:3005` (development)
   - **Home URL:** `http://localhost:3005`
   - **Valid redirect URIs:**
     ```
     http://localhost:3005/api/auth/callback/keycloak
     http://localhost:3005/*
     ```
   - **Valid post logout redirect URIs:**
     ```
     http://localhost:3005
     ```
   - **Web origins:** `http://localhost:3005`

6. Click **"Save"**

#### 3.2 Get Client Credentials

1. Go to **"Clients"** → **"evonest-app"**

2. Click **"Credentials"** tab

3. Copy the **Client secret** - you'll need this!

::: tip Save These Values
You need:

- **Client ID:** `evonest-app`
- **Client Secret:** (from Credentials tab)
- **Issuer URL:** `http://localhost:8080/realms/evonest`
  :::

---

### Step 4: Configure User Attributes (GDPR Compliance)

#### 4.1 Set Up Required User Attributes

1. Go to **"Realm settings"** → **"User profile"** tab

2. Verify these attributes exist:
   - `username` - Required
   - `email` - Required
   - `firstName` - Optional
   - `lastName` - Optional

#### 4.2 Add Custom Attributes (Optional)

For EvoNEST-specific data:

1. Click **"Create attribute"**

2. Add attribute:

   - **Name:** `laboratory`
   - **Display name:** Laboratory
   - **Validation:** None
   - **Required:** No

3. Repeat for other custom fields if needed

#### 4.3 Set Up Consent Screen (GDPR)

1. Go to **"Clients"** → **"evonest-app"**

2. **Settings** tab:

   - **Consent required:** ON
   - **Display client on consent screen:** ON
   - **Consent screen text:** `Allow EvoNEST to access your profile information`

3. Click **"Save"**

This ensures users explicitly consent to data usage (GDPR requirement).

---

### Step 5: Create Test User

#### 5.1 Add a User

1. Go to **"Users"** (left sidebar)

2. Click **"Add user"**

3. Fill in:

   - **Username:** `testuser`
   - **Email:** `test@example.com`
   - **Email verified:** ✅
   - **First name:** Test
   - **Last name:** User
   - **Enabled:** ✅

4. Click **"Create"**

#### 5.2 Set Password

1. After creating, go to **"Credentials"** tab

2. Click **"Set password"**

3. Enter:

   - **Password:** `TestPassword123`
   - **Confirm:** `TestPassword123`
   - **Temporary:** OFF (so user doesn't have to change on first login)

4. Click **"Save"**

---

## Part 2: Configure EvoNEST for Keycloak

### Step 1: Install Keycloak Provider

NextAuth already supports Keycloak, no additional packages needed!

### Step 2: Update Environment Variables

#### 2.1 Update `.env.local`

```txt
NEXTAUTH_SECRET=your-existing-secret

# Keycloak Configuration
KEYCLOAK_CLIENT_ID=evonest-app
KEYCLOAK_CLIENT_SECRET=your-client-secret-from-keycloak
KEYCLOAK_ISSUER=http://localhost:8080/realms/evonest
```

#### 2.2 Update `.env.development`

```txt
NEXTAUTH_URL=http://localhost:3005
MONGODB_URI=mongodb://evonest_user:your_password@mongo_dev:27017
STORAGE_PATH='/usr/evonest/file_storage_dev'

# Keycloak
KEYCLOAK_CLIENT_ID=evonest-app
KEYCLOAK_CLIENT_SECRET=your-client-secret-from-keycloak
KEYCLOAK_ISSUER=http://localhost:8080/realms/evonest
```

---

### Step 3: Update NextAuth Configuration

#### 3.1 Import Keycloak Provider

Open `src/app/api/auth/[...nextauth]/options.ts`

Add import:

```typescript{3}
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import KeycloakProvider from "next-auth/providers/keycloak";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
```

#### 3.2 Add Keycloak to Providers

```typescript
providers: [
    KeycloakProvider({
        clientId: process.env.KEYCLOAK_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
        issuer: process.env.KEYCLOAK_ISSUER!,
    }),
    // Keep other providers if needed...
],
```

#### 3.3 Update Callbacks

Add Keycloak user handling:

```typescript
callbacks: {
    async signIn({ user, account, profile }) {
        if (account?.provider === "keycloak") {
            try {
                const client = await get_or_create_client();
                const users = client.db("usersdb").collection("users");

                // Extract user info from Keycloak
                const keycloakProfile = profile as any;

                await users.findOneAndUpdate(
                    { auth0id: user.id },
                    {
                        $set: {
                            name: user.name || keycloakProfile.preferred_username,
                            email: user.email,
                            recentChangeDate: new Date().toISOString()
                        },
                        $setOnInsert: {
                            auth0id: user.id,
                            role: 'user',
                            activeDatabase: 'admin',
                            databases: ['admin'],
                            logbook: [`${new Date().toISOString()}: user created via Keycloak`]
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
        // Handle other providers...
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
            session.user.sub = token.sub as string;
        }
        return session;
    }
},
```

---

### Step 4: Test Keycloak Authentication

#### 4.1 Restart EvoNEST

```bash
docker compose -f docker-compose.dev.yml restart
```

#### 4.2 Test Login

1. Go to: [http://localhost:3005](http://localhost:3005)

2. Click **"Sign in with Keycloak"** (or similar text)

3. You'll be redirected to Keycloak login page

4. Login with test user:

   - **Username:** `testuser`
   - **Password:** `TestPassword123`

5. **Consent screen** appears (if enabled):

   - Review permissions
   - Click **"Accept"**

6. Redirected back to EvoNEST, logged in!

#### 4.3 Verify User in Database

1. Check Mongo Express: [http://localhost:8081](http://localhost:8081)

2. Go to `usersdb` → `users`

3. New user should exist with Keycloak ID

---

## Part 3: GDPR Compliance Features

### Data Protection Settings

#### 1. User Data Export (Right to Data Portability)

In Keycloak Admin Console:

1. **"Realm settings"** → **"User profile"**

2. Enable **"Account Console"** for users

3. Users can access: `http://localhost:8080/realms/evonest/account`

4. Users can download their data as JSON

#### 2. User Account Deletion (Right to be Forgotten)

**Option A: Self-Service** (recommended)

1. **"Realm settings"** → **"Login"**

2. Enable **"Delete account"**

3. Users can delete their own accounts from Account Console

**Option B: Admin-Managed**

Create an admin interface in EvoNEST to handle deletion requests.

#### 3. Consent Management

Already configured with consent screen. Users must explicitly accept.

#### 4. Data Retention Policies

Configure session timeouts:

1. **"Realm settings"** → **"Sessions"**

2. Set:
   - **SSO Session Idle:** 30 minutes
   - **SSO Session Max:** 10 hours
   - **Offline Session Idle:** 30 days

#### 5. Audit Logging

Enable audit logging:

1. **"Realm settings"** → **"Events"**

2. **Event Listeners:**

   - Add `jboss-logging`

3. **User Events Settings:**

   - **Save Events:** ON
   - **Expiration:** 365 days
   - **Saved Types:** Select all

4. Click **"Save"**

View events: **"Events"** tab shows login history, admin actions, etc.

---

## Part 4: Production Deployment

### Step 1: Production Keycloak Setup

#### 1.1 Update Docker Compose for Production

Create `docker-compose.keycloak.prod.yml`:

```yaml
version: "3.8"

services:
  postgres-keycloak:
    image: postgres:15-alpine
    container_name: evonest_keycloak_db_prod
    restart: unless-stopped
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
    volumes:
      - keycloak_postgres_data_prod:/var/lib/postgresql/data
    networks:
      - evonest_network

  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    container_name: evonest_keycloak_prod
    restart: unless-stopped
    command: start --optimized
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres-keycloak:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      KC_HOSTNAME: auth.your-domain.com
      KC_HOSTNAME_STRICT: true
      KC_HTTP_ENABLED: false
      KC_HTTPS_ENABLED: true
      KC_PROXY: edge
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    ports:
      - "8443:8443"
    depends_on:
      - postgres-keycloak
    networks:
      - evonest_network

networks:
  evonest_network:
    external: true

volumes:
  keycloak_postgres_data_prod:
```

#### 1.2 Set Up SSL/TLS

**Option A: Use Reverse Proxy (Recommended)**

Set up Nginx or Traefik with Let's Encrypt:

```nginx
server {
    listen 443 ssl http2;
    server_name auth.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/auth.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/auth.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Option B: Keycloak with SSL Certificate**

Mount certificates in Docker and configure Keycloak to use them.

---

### Step 2: Update Production Environment

#### 2.1 Create `.env.production` for Keycloak

```txt
KEYCLOAK_DB_PASSWORD=your-strong-db-password
KEYCLOAK_ADMIN_PASSWORD=your-strong-admin-password
```

#### 2.2 Update EvoNEST `.env.production`

```txt
NEXTAUTH_URL=https://your-domain.com
MONGODB_URI=mongodb://evonest_user:password@mongo:27017
STORAGE_PATH='/usr/evonest/file_storage'

# Keycloak Production
KEYCLOAK_CLIENT_ID=evonest-app
KEYCLOAK_CLIENT_SECRET=production-client-secret
KEYCLOAK_ISSUER=https://auth.your-domain.com/realms/evonest
```

---

### Step 3: Update Keycloak Client Settings

1. Login to Keycloak Admin Console (production)

2. Go to **"Clients"** → **"evonest-app"**

3. Update **Valid redirect URIs:**

   ```
   https://your-domain.com/api/auth/callback/keycloak
   https://your-domain.com/*
   ```

4. Update **Web origins:**

   ```
   https://your-domain.com
   ```

5. Click **"Save"**

---

## Security Best Practices

### 1. Strong Passwords

- Enforce password policies in Keycloak
- Go to **"Authentication"** → **"Policies"**
- Set minimum length, complexity, etc.

### 2. Two-Factor Authentication

Enable OTP:

1. **"Authentication"** → **"Required Actions"**
2. Enable **"Configure OTP"**
3. Users will be prompted to set up 2FA on first login

### 3. Rate Limiting

Protect against brute force:

1. **"Realm settings"** → **"Security defenses"**
2. **Brute Force Detection:**
   - **Enabled:** ON
   - **Max Login Failures:** 5
   - **Wait Increment:** 60 seconds
   - **Quick Login Check:** 1000 milliseconds

### 4. Regular Backups

Backup PostgreSQL database:

```bash
docker exec evonest_keycloak_db_prod pg_dump -U keycloak keycloak > keycloak_backup.sql
```

Restore:

```bash
docker exec -i evonest_keycloak_db_prod psql -U keycloak keycloak < keycloak_backup.sql
```

### 5. Monitor Logs

View Keycloak logs:

```bash
docker logs evonest_keycloak_prod -f
```

Check for:

- Failed login attempts
- Unusual access patterns
- Error messages

---

## Troubleshooting

### Problem: "Invalid redirect URI"

**Cause:** Redirect URI mismatch

**Solution:**

1. Check exact URI in error message
2. Add to Keycloak client's "Valid redirect URIs"
3. Include wildcards: `http://localhost:3005/*`

### Problem: Keycloak won't start

**Check logs:**

```bash
docker logs evonest_keycloak
```

**Common causes:**

- Database not ready (wait longer)
- Port 8080 already in use
- Invalid environment variables

### Problem: "Token verification failed"

**Causes:**

- NEXTAUTH_SECRET not set
- Issuer URL mismatch
- Clock skew between containers

**Solutions:**

1. Verify environment variables
2. Check issuer URL matches exactly
3. Synchronize system clocks

### Problem: Users can't login after migration

**Solution:**

1. Clear browser cookies
2. Clear NextAuth session
3. Re-login with Keycloak

---

## GDPR Compliance Checklist

Use this checklist to ensure compliance:

- [ ] Data stored in EU (use EU-based servers for Keycloak)
- [ ] Users can access their data (Account Console enabled)
- [ ] Users can export their data (Export feature enabled)
- [ ] Users can delete their accounts (Self-service deletion enabled)
- [ ] Explicit consent required (Consent screen configured)
- [ ] Data retention policies set (Session timeouts configured)
- [ ] Audit logging enabled (Events logging ON)
- [ ] Privacy policy linked (Add to consent screen)
- [ ] SSL/TLS in production (HTTPS enforced)
- [ ] Regular backups (Backup schedule in place)
- [ ] Security monitoring (Log monitoring set up)
- [ ] Incident response plan (Document procedures)

---

## Migration from Existing Auth

If migrating from Google OAuth or credentials:

### Step 1: Run Both Systems in Parallel

Keep existing auth while adding Keycloak:

```typescript
providers: [
    KeycloakProvider({ /* config */ }),
    GoogleProvider({ /* existing */ }),
    CredentialsProvider({ /* existing */ }),
],
```

### Step 2: Migrate Users Gradually

1. Announce migration to users
2. Have users login with Keycloak
3. Link accounts if needed (custom logic)

### Step 3: Deprecate Old Auth

After migration period:

1. Remove old providers
2. Update documentation
3. Notify remaining users

---

## Next Steps

- **[User Management](/user-docs/user-account)** - Managing roles and permissions
- **[Security Best Practices](/user-docs/security)** - Additional hardening
- **[Backup and Recovery](/user-docs/backup)** - Data protection strategies

---

## Additional Resources

- **Keycloak Documentation:** [https://www.keycloak.org/documentation](https://www.keycloak.org/documentation)
- **GDPR Compliance:** [https://gdpr.eu](https://gdpr.eu)
- **NextAuth.js Keycloak Provider:** [https://next-auth.js.org/providers/keycloak](https://next-auth.js.org/providers/keycloak)

---

**Congratulations!** You now have a fully EU-compliant authentication system for EvoNEST with complete control over your user data and privacy.
