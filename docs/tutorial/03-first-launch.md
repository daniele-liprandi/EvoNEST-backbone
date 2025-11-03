# Module 3: First launch

::: tip Learning objectives
By the end of this module, you will have:

- ✅ Logged into EvoNEST for the first time
- ✅ Initialized the configuration
- ✅ Explored the main interface
- ✅ Verified all components are working
- ✅ Understood the main navigation
  :::

**Estimated time:** 20 minutes

## Prerequisites

Before starting this module, make sure you've completed [Module 2: Installation](/tutorial/02-installation) and have:

- ✅ EvoNEST running (Docker containers up)
- ✅ Access to the login page at [http://localhost:3005](http://localhost:3005)

## Overview

In this module, you'll:

1. Log in with the default admin account
2. Initialize the system configuration
3. Take a tour of the EvoNEST interface
4. Understand the main navigation areas
5. Verify the installation is complete

## Step 1: Access EvoNEST

1. **Make sure EvoNEST is running**

   Check the containers are up:

   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

   All should show "Up" status.

2. **Open your web browser**

   Visit: **[http://localhost:3005](http://localhost:3005)**

   ::: tip Supported browsers
   EvoNEST works best with:

   - Chrome/Chromium (recommended)
   - Firefox
   - Edge
   - Safari
     :::

3. **You should see the login page**

   The page displays:

   - EvoNEST logo
   - Welcome message
   - Login form

## Step 2: Log in with default credentials

EvoNEST comes with a default admin account for initial setup.

### Login details

Use these credentials to log in:

- **Username:** `admin`
- **Password:** `pass`

::: warning Change default credentials later
After the tutorial, you should:

1. Set up proper authentication (Auth0, Google, etc.)
2. Create individual user accounts
3. Disable or change the default admin account

See the [Developer documentation](/developer-docs) for details.
:::

### Wait for page compilation

The first time you access the login page, Next.js may take a moment to compile the frontend code, as we are running in development mode. This can take up to 5 minutes depending on your machine.

**Expected result:** You should see a "First Time Setup" dialog asking you to initialize the configuration.

::: details Troubleshooting: Can't log in

**"Invalid credentials" or "Authentication failed":**

- Double-check you typed `admin` and `pass` correctly (lowercase)
- Make sure your `.env.local` file has the NEXTAUTH_SECRET set
- Try restarting the containers:
  ```bash
  docker compose -f docker-compose.dev.yml restart
  ```

**Login page won't load:**

- Verify containers are running: `docker compose -f docker-compose.dev.yml ps`
- Check logs for errors: `docker compose -f docker-compose.dev.yml logs -f`
- Try accessing [http://127.0.0.1:3005](http://127.0.0.1:3005) instead

**Stuck on loading screen:**

- Wait 30 seconds - first login can be slow
- Check browser console for errors (F12 → Console tab)
- Clear browser cache and cookies, try again
  :::

## Step 3: Initialize configuration

After logging in for the first time, you'll see a **First Time Setup** dialog instead of the dashboard.

1. **Click the "Initialise Configuration" button**

   This will:

   - Create the default configuration in your NEST
   - Set up sample types (animal, plant, tissue, etc.)
   - Create default trait types (mass, length, etc.)
   - Configure equipment types
   - Prepare the NEST structure

::: tip What is a NEST?
A **NEST** is what we call a database in EvoNEST. Think of it as a container for all your lab's data - samples, experiments, traits, and settings. Sometimes, research groups want to separate their data, so each project can have its own NEST, and users can be given access to specific NESTs. The first time you log in, EvoNEST creates your first NEST, admin, and populates it with default configurations.
:::

## Step 4: Explore the dashboard

After initialization completes, you'll see the EvoNEST dashboard (homepage).

### What you'll see

The dashboard provides an overview of your current NEST:

#### 📊 **Total entries**

At the top, you'll see cards showing:

- **Users** - Active users with access to this NEST
- **Samples** - Total number of biological samples
- **Experiments** - Number of experiments tracked
- **Traits** - Total trait measurements recorded

Right now, these will all show a **1** (just the admin user) since this is a fresh NEST.

#### 📰 **The collection over the world**

A world map visualizing sample collection locations from your current NEST. Currently empty.

#### 📝 **Name checker**

A tool to validate taxonomic names using the Global Name Verifier. You can see if the service is working by writing the name of any organism. If a photo is available, it will be shown.

#### 📰 **News from the devs**

A feed showing the latest updates from the EvoNEST development team. Stay informed about new features and releases.

#### 🌳 **Treemap**

A visual representation of your data hierarchy for samples and subsamples.

## Step 5: Navigate the main menu

Let's explore the main navigation to understand where everything is.

::: tip Explore freely
Click through the different sections to get familiar with the interface. We'll walk through the data structure next.
:::

### Navigation bar

At the top or side of the screen, you'll see the main navigation menu with these sections:

- 🏠 **Home** - Returns you to the dashboard
- 👤 **Users** - Manage users and which NESTs they can access (you can also create additional NESTs here)
- 🧬 **Samples** - Manage biological specimens, create parent samples and subsamples, search and filter
- 🧪 **Experiments** - Record raw data from instruments, upload files, link to samples
- 📏 **Traits** - Extract and record processed measurements, view clean data tables, statistical analysis
- ⚙️ **Settings** - Configure sample types, trait types, equipment, and lab information for this NEST
- 📚 **Documentation** - Access the main documentation

At the top-right, you'll see the `Scan QR` button, the theme toggle, **the current NEST name**, and the user avatar.

::: tip Managing Multiple NESTs
From the **Users** page, admins can create additional NESTs for different projects or research groups. Users can be granted access to multiple NESTs and switch between them using the NEST selector in the top-right corner.
:::

## Step 6: understand the data structure

Before we start adding data, let's understand how EvoNEST organizes information.

### Hierarchical structure

EvoNEST uses a hierarchical data model:

```
┌─────────────────────────────────────┐
│          👤 Users                  │  ← Researchers
└─────────────────────────────────────┘
            ↓ create/manage
┌─────────────────────────────────────┐
│       🧬 Samples (Specimens)       │  ← Whole organisms
└─────────────────────────────────────┘
            ↓ can have
┌─────────────────────────────────────┐
│       🧬 Subsamples (Parts)        │  ← Parts of specimens
└─────────────────────────────────────┘
            ↓ both can undergo
┌─────────────────────────────────────┐
│   🧪 Experiments (Measurements)    │  ← Raw data from instruments
└─────────────────────────────────────┘
            ↓ extract to
┌─────────────────────────────────────┐
│     📏 Traits (Processed Data)     │  ← Extracted measurements
└─────────────────────────────────────┘
```

### Key concepts

#### Samples

- Represent biological specimens (animals, plants, etc.)
- Have taxonomic information (family, genus, species)
- Have collection metadata (location, date, collector)
- Can undergo experiments and have traits directly
- Example: "PANTH_001" - a panther specimen

#### Subsamples

- Parts or derivatives of parent samples
- Linked to a parent sample
- Have their own type (tissue, bone, silk, etc.)
- Can also undergo experiments and have traits
- Example: "PANTH_001_muscle_01" - muscle tissue from the panther

#### Experiments

- Raw data and measurements from instruments/equipment
- Linked to samples or subsamples
- Contains raw data files, images, instrument output
- Example: "SEM imaging of fibre sample" with raw microscopy files
- Example: "Tensile test run" with force-extension curves

#### Traits

- Processed, extracted measurements from experiments
- Clean data points without raw files
- Linked to samples or subsamples (and optionally to experiments)
- Have units (μm, g, mm, etc.)
- Can have multiple measurements (replicates)
- Can be about a specific detail of the sample
- Example: "fiber_diameter: 25.5 μm" extracted from SEM images

## Step 7: Explore additional features

### User profile

1. **Click the avatar** in the top-right corner

2. **You'll see:**
   - Default admin user email
   - Logout button

## Checkpoint: ready to move to a production launch?

::: warning Issues?
If something isn't working, check:

1. Browser console for errors (F12)
2. Docker logs: `docker compose -f docker-compose.dev.yml logs -f`
3. [Troubleshooting Guide](/tutorial/troubleshooting)
   :::


## Step 8: Running in production mode

So far, you've been running EvoNEST in **development mode**, which is great for learning and testing. However, if you want to run EvoNEST in a production-like environment with better performance and optimization, you can switch to **production mode**.

::: warning Development vs Production
**Development mode** is ideal for:

- Learning and testing EvoNEST's code
- Making code changes (auto-reloads on file changes)
- Debugging with detailed error messages

**Production mode** should be used for:
- Daily lab use with real data
- Better performance and optimized builds
- Running on servers accessible to multiple users

:::

### 8.1 Stop development containers

First, stop the development environment:

```bash
docker compose -f docker-compose.dev.yml down
```

### 8.2 Create `.env.production` file

Production mode requires a different environment configuration.

1. **In VS Code, create a new file:**

   - Click the "New File" icon
   - Name it `.env.production`
   - Add this content:

   ```txt
   NEXTAUTH_URL=http://localhost:3000
   MONGODB_URI=mongodb://root:pass@mongo:27017
   STORAGE_PATH='/usr/evonest/file_storage'
   ```

   ::: warning Change the password!
   Replace `pass` with your own secure password. Use something unique and different from your development password!

   **Example:**

   ```txt
   MONGODB_URI=mongodb://root:MyLabPassword2024!@mongo:27017
   ```

   :::

2. **Save the file** (Ctrl+S or Cmd+S)

::: tip Port difference
Notice that production mode uses port **3000** instead of 3005. This is the standard port for production deployments.
:::

### 8.3 Update production Docker compose credentials

The production configuration in `docker-compose.yml` also needs to match your MongoDB credentials.

1. **In VS Code, open `docker-compose.yml`**

   - Find it in the Explorer panel and click to open

2. **Find the MongoDB section** (around line 23-31)

   - Use Ctrl+F (Cmd+F on Mac) to search for `mongo:`

3. **Update the username and password** to match what you set in `.env.production`:

   ```yaml{7,8}
   mongo:
     image: mongo:5.0
     ports:
       - "27017:27017"
     container_name: evonest_mongodb
     restart: unless-stopped
     environment:
       MONGO_INITDB_ROOT_USERNAME: root
       MONGO_INITDB_ROOT_PASSWORD: pass
     volumes:
       - mongo_data:/data/db
   ```

4. **Also update the backup service** (around line 33-46):

   ```yaml{8}
   backup:
     build:
       context: .
       dockerfile: Dockerfile.backup
     container_name: mongo_backup
     restart: unless-stopped
     depends_on:
       - mongo
     volumes:
       - mongo_backups:/backups
     environment:
       MONGO_URI: "mongodb://root:pass@mongo:27017"
       DAILY_RETENTION: "7"
       WEEKLY_RETENTION: "4"
       MONTHLY_RETENTION: "12"
   ```

5. **Save the file** (Ctrl+S or Cmd+S)

### 8.4 Build and start production containers

Production mode requires building the application first (this creates an optimized version).

```bash
docker compose up --build -d
```

::: tip First build takes time
The first production build can take 5-10 minutes as it:

- Installs all dependencies
- Builds an optimized Next.js application
- Creates production Docker images

Subsequent starts will be much faster.
:::

**Expected output:**

```txt
[+] Building 245.3s (15/15) FINISHED
[+] Running 4/4
 ✔ Network evonest-backbone_default    Created
 ✔ Container evonest_mongodb            Started
 ✔ Container mongo_backup               Started
 ✔ Container evonest_backbone_prod      Started
```

### 8.5 Monitor production startup

Watch the logs to see the production server starting:

```bash
docker compose logs -f node
```

**What you'll see:**

```txt
evonest_backbone_prod  | > evonest@0.1.0 start
evonest_backbone_prod  | > next start -p 3000
evonest_backbone_prod  |
evonest_backbone_prod  |  ▲ Next.js 14.2.4
evonest_backbone_prod  |  - Local:        http://localhost:3000
evonest_backbone_prod  |
evonest_backbone_prod  |  ✓ Ready in 1.8s
```

::: tip Faster startup
Production mode typically is much faster than development mode because the code is pre-compiled.
:::

### 8.6 Access production EvoNEST

Once the containers are running, open your browser and visit:

**[http://localhost:3000](http://localhost:3000)**

### 8.7 Production management commands

Here's a quick reference for managing production mode:

| Task               | Command                        |
| ------------------ | ------------------------------ |
| Start production   | `docker compose up -d`         |
| Stop production    | `docker compose down`          |
| View logs          | `docker compose logs -f`       |
| View app logs only | `docker compose logs -f node`  |
| Check status       | `docker compose ps`            |
| Restart            | `docker compose restart`       |
| Rebuild & start    | `docker compose up --build -d` |
| Complete reset     | `docker compose down -v`       |

### 8.8 Switching between development and production

You can switch between modes anytime:

**To use development mode:**

```bash
docker compose down                              # Stop production
docker compose -f docker-compose.dev.yml up -d   # Start development
# Access at http://localhost:3005
```

**To use production mode:**

```bash
docker compose -f docker-compose.dev.yml down    # Stop development
docker compose up -d                              # Start production
# Access at http://localhost:3000
```

## Checkpoint: let's get ready for NEST configuration

Before moving to the next module, verify:

- [ ] Successfully logged in with admin/pass into the production EvoNEST, on port 3000
- [ ] Initialized the configuration (clicked "Initialize Configuration")
- [ ] Can navigate between Users, Samples, Traits, Experiments, Settings
- [ ] See empty tables (no data yet - that's correct!)
- [ ] Configuration/Settings page loads
- [ ] Understand the data structure (Samples → Experiments → Traits )
- [ ] Can log out and log back in

::: tip All Verified?
Perfect! You're ready to start configuring EvoNEST for your laboratory's needs.
:::

## Next steps

**Great progress!** You've successfully logged in and explored the EvoNEST interface.

In the next module, you'll:

- Configure sample types for your laboratory
- Set up trait types with proper units
- Define equipment and measurement tools
- Customize sample ID generation
