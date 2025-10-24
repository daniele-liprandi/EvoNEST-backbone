# Module 3: First launch

::: tip Learning objectives
By the end of this module, you will have:
- ✅ Logged into EvoNEST for the first time
- ✅ Explored the main interface
- ✅ Verified all components are working
- ✅ Understood the main navigation
:::

**Estimated time:** 20 minutes

---

## Prerequisites

Before starting this module, make sure you've completed [Module 2: Installation](/tutorial/02-installation) and have:
- ✅ EvoNEST running (Docker containers up)
- ✅ Access to the login page at [http://localhost:3005](http://localhost:3005)

---

## Overview

In this module, you'll:
1. Log in with the default admin account
2. Take a tour of the EvoNEST interface
3. Understand the main navigation areas
4. Verify the installation is complete

---

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

---

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

### Steps to log in

1. **Enter the username** in the first field: `admin`

2. **Enter the password** in the second field: `pass`

3. **Click "Sign in"** or press Enter

4. **Wait a moment** while authentication completes

**Expected result:** You should be redirected to the EvoNEST homepage/dashboard.

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

---

## Step 3: Explore the dashboard

After logging in, you'll see the EvoNEST dashboard (homepage).

### What you'll see

The dashboard provides an overview of your system:

#### 📊 **Quick statistics**
At the top, you'll see cards showing:
- **Samples** - Total number of biological samples in the system
- **Traits** - Total trait measurements recorded
- **Experiments** - Number of experiments tracked
- **Users** - Active users in the system

Right now, these will all show **0** or **1** (just the admin user) since this is a fresh installation.

#### 🎯 **Quick actions**
Buttons to quickly access common tasks:
- "Add New Sample"
- "Record Trait"
- "Create Experiment"

#### 📰 **Recent activity** (if configured)
Shows recent changes and updates to your data.

::: tip Your first look
Don't worry if the dashboard looks empty - that's expected! In the next modules, you'll add data and see these sections populate.
:::

---

## Step 4: Navigate the main menu

Let's explore the main navigation to understand where everything is.

### Navigation bar

At the top or side of the screen, you'll see the main navigation menu with these sections:

#### 🏠 **Home**
- Returns you to the dashboard
- Overview of your system

#### 🧬 **Samples**
- Manage biological specimens
- Create parent samples (whole organisms)
- Create subsamples (tissues, parts)
- Search and filter samples
- View sample details

#### 📏 **Traits**
- Record measurements and characteristics
- View trait data tables
- Filter by sample, type, date
- Statistical analysis tools

#### 🧪 **Experiments**
- Create and manage experiments
- Link samples and traits to experiments
- Upload protocol documents
- Track experimental procedures

#### ⚙️ **Settings**
- Configure sample types
- Define trait types and units
- Set up equipment list
- Manage lab information
- Database settings

#### 👤 **User profile**
- View your account information
- Change database (if you have multiple)
- Manage preferences
- Log out

### Try navigating

Click through each section to get familiar with the layout:

1. **Click "Samples"** - You'll see an empty table (we'll add samples in Module 5)
2. **Click "Traits"** - Empty table, ready for data
3. **Click "Experiments"** - No experiments yet
4. **Click "Settings"** - This is where we'll configure types in Module 4
5. **Click "Home"** - Returns to the dashboard

::: tip Get comfortable
Take a few minutes to click around. You can't break anything at this stage - there's no data yet!
:::

---

## Step 5: Verify installation components

Let's make sure all features are working correctly.

### 5.1 Check database connection

1. **Go to Samples** (click "Samples" in the navigation)

2. **You should see:**
   - An empty table with column headers
   - "No samples found" or similar message
   - "Add Sample" button

3. **This confirms:**
   - ✅ Database is connected
   - ✅ Collections are created
   - ✅ Frontend can query the database

### 5.2 Check configuration system

1. **Go to Settings** → **Configuration** (or `/settings/main`)

2. **You should see:**
   - Configuration wizard or setup interface
   - Options to configure types
   - Default settings loaded

3. **This confirms:**
   - ✅ Configuration system is working
   - ✅ Default types are loaded
   - ✅ Settings can be modified

### 5.3 Check file system

1. **Look for** file upload interfaces in:
   - Experiments section (upload documents)
   - Sample creation forms (upload images)

2. **You should see:**
   - File upload buttons/dropzones
   - Instructions for supported formats

3. **This confirms:**
   - ✅ File storage is configured
   - ✅ Upload system is ready

::: tip Don't upload yet
We'll practice uploading files in Module 5. For now, just verify the upload interfaces are visible.
:::

---

## Step 6: Understand the data structure

Before we start adding data, let's understand how EvoNEST organizes information.

### Hierarchical structure

EvoNEST uses a hierarchical data model:

```
┌─────────────────────────────────────┐
│          👤 Users                    │  ← Researchers
└─────────────────────────────────────┘
            ↓ create/manage
┌─────────────────────────────────────┐
│       🧬 Samples (Specimens)        │  ← Whole organisms
└─────────────────────────────────────┘
            ↓ have
┌─────────────────────────────────────┐
│       🧬 Subsamples (Tissues)       │  ← Parts of specimens
└─────────────────────────────────────┘
            ↓ measured in
┌─────────────────────────────────────┐
│       📏 Traits (Measurements)      │  ← Data points
└─────────────────────────────────────┘
            ↓ part of
┌─────────────────────────────────────┐
│      🧪 Experiments (Studies)       │  ← Research projects
└─────────────────────────────────────┘
```

### Key concepts

#### **Samples**
- Represent biological specimens (animals, plants, etc.)
- Have taxonomic information (family, genus, species)
- Have collection metadata (location, date, collector)
- Example: "PANTH_001" - a lion specimen

#### **Subsamples**
- Parts or derivatives of parent samples
- Linked to a parent sample
- Have their own type (tissue, bone, silk, etc.)
- Example: "PANTH_001_muscle" - muscle tissue from the lion

#### **Traits**
- Measurements or characteristics
- Linked to samples or subsamples
- Have units (μm, g, mm, etc.)
- Can have multiple measurements (replicates)
- Example: "fiber_diameter: 25.5 μm"

#### **Experiments**
- Groups related samples and traits
- Tracks research procedures
- Can have attached files (protocols, images)
- Example: "Tensile Testing - Spring 2024"

::: tip Understanding Flow
The typical workflow is:
1. Create **Samples** (collect specimens)
2. Optionally create **Subsamples** (prepare tissues)
3. Record **Traits** (make measurements)
4. Organize in **Experiments** (track research)
:::

---

## Step 7: Explore Additional Features

### User Profile

1. **Click your username** in the top-right corner

2. **You'll see:**
   - Your user information
   - Active database
   - Option to switch databases (if configured)
   - Logout button

### Search Functionality

Look for search boxes in different sections:
- **Sample search** - Find samples by name, species, location
- **Trait search** - Filter traits by type, sample, date
- **Global search** - Find anything across the system

### Help and Documentation

Check if these links are accessible:
- **Help** or **?** icon - Quick tips
- **Documentation** link - Full user documentation
- **API Docs** - For developers

---

## Checkpoint: Ready to Configure?

Before moving to the next module, verify:

- [ ] ✅ Successfully logged in with admin/pass
- [ ] ✅ Can navigate between Samples, Traits, Experiments, Settings
- [ ] ✅ See empty tables (no data yet - that's correct!)
- [ ] ✅ Configuration/Settings page loads
- [ ] ✅ Understand the data structure (Samples → Traits → Experiments)
- [ ] ✅ Can log out and log back in

::: tip All Verified?
Perfect! You're ready to start configuring EvoNEST for your laboratory's needs.
:::

::: warning Issues?
If something isn't working, check:
1. Browser console for errors (F12)
2. Docker logs: `docker compose -f docker-compose.dev.yml logs -f`
3. [Troubleshooting Guide](/tutorial/troubleshooting)
:::

---

## Quick Reference: Navigation Shortcuts

| Section | What You'll Find |
|---------|-----------------|
| **Home** | Dashboard, statistics, quick actions |
| **Samples** | Create and manage specimens, subsamples |
| **Traits** | Record measurements, view data tables |
| **Experiments** | Track research projects, upload files |
| **Settings** | Configure types, units, lab info |
| **User Profile** | Account info, database selection, logout |

---

## Next Steps

**Great progress!** You've successfully logged in and explored the EvoNEST interface.

In the next module, you'll:
- Configure sample types for your laboratory
- Set up trait types with proper units
- Define equipment and measurement tools
- Customize sample ID generation
